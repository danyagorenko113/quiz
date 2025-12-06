"use client"

import { useState, useEffect } from "react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Music, Users, Play, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

interface Playlist {
  id: string
  name: string
  images: { url: string }[]
  tracks: { total: number }
}

export function HostDashboard({ session }: { session: Session }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [partyCode, setPartyCode] = useState<string | null>(null)
  const [showLobby, setShowLobby] = useState(false)

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const response = await fetch("https://api.spotify.com/v1/me/playlists", {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
        const data = await response.json()
        setPlaylists(data.items || [])
      } catch (error) {
        console.error("[v0] Error fetching playlists:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [session.accessToken])

  const handleStartParty = async () => {
    if (!selectedPlaylist) return

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    try {
      const response = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          playlistId: selectedPlaylist,
          host: session.user?.name,
          hostEmail: session.user?.email,
          maxPlayers: 5,
        }),
      })

      if (response.ok) {
        setPartyCode(code)
        setShowLobby(true)
      } else {
        console.error("[v0] Failed to create party")
      }
    } catch (error) {
      console.error("[v0] Error creating party:", error)
    }
  }

  if (showLobby && partyCode) {
    return <PartyLobby partyCode={partyCode} session={session} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <Music className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Host a Quiz Party</h1>
              <p className="text-emerald-100">Welcome, {session.user?.name}</p>
            </div>
          </div>
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card className="p-6 bg-background/95 backdrop-blur">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select a Playlist
          </h2>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading your playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No playlists found. Create one in Spotify first!
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => setSelectedPlaylist(playlist.id)}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPlaylist === playlist.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-border hover:border-emerald-300"
                    }`}
                  >
                    {playlist.images[0] ? (
                      <img
                        src={playlist.images[0].url || "/placeholder.svg"}
                        alt={playlist.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                        <Music className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{playlist.name}</h3>
                      <p className="text-sm text-muted-foreground">{playlist.tracks.total} tracks</p>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleStartParty}
                disabled={!selectedPlaylist}
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Quiz Party
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function PartyLobby({ partyCode, session }: { partyCode: string; session: Session }) {
  const [players, setPlayers] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        console.log("[v0] Polling party data for code:", partyCode)
        const response = await fetch(`/api/party?code=${partyCode}`)
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Party data received:", data.party)
          const playerList = data.party.players || []
          setPlayers(playerList)
        } else {
          console.error("[v0] Failed to fetch party:", response.status)
        }
      } catch (error) {
        console.error("[v0] Error fetching party:", error)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [partyCode])

  const copyInviteCode = () => {
    navigator.clipboard.writeText(partyCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startQuiz = async () => {
    try {
      const response = await fetch("/api/party/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: partyCode }),
      })

      if (response.ok) {
        window.location.href = `/quiz/${partyCode}`
      } else {
        const error = await response.json()
        console.error("[v0] Failed to start quiz:", error)
        alert("Failed to start quiz. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error starting quiz:", error)
      alert("Failed to start quiz. Please try again.")
    }
  }

  const canStart = players.length >= 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card className="p-8 bg-background/95 backdrop-blur">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Party Lobby</h1>
            <p className="text-muted-foreground">Share the code with your friends</p>
          </div>

          <div className="bg-muted rounded-lg p-6 mb-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Party Code</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-5xl font-bold tracking-wider">{partyCode}</p>
              <Button onClick={copyInviteCode} size="sm" variant="outline" className="bg-transparent">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Players join at: {window.location.origin}/join</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({players.length + 1}/5)
              </h2>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border-2 border-emerald-500">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                  {session.user?.name?.[0]?.toUpperCase() || "H"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{session.user?.name}</p>
                  <p className="text-xs text-muted-foreground">Host</p>
                </div>
              </div>

              {players.map((player, index) => {
                const playerName = typeof player === "string" ? player : (player as any).name || "Player"
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg animate-in fade-in slide-in-from-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold">
                      {playerName[0]?.toUpperCase() || "P"}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{playerName}</p>
                      <p className="text-xs text-muted-foreground">Player</p>
                    </div>
                  </div>
                )
              })}

              {players.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Waiting for players to join...</p>
                  <p className="text-sm mt-2">Minimum 2 players (including host) required</p>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={startQuiz}
            disabled={!canStart}
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            <Play className="w-5 h-5 mr-2" />
            {canStart ? "Start Quiz" : `Need ${1 - players.length} more player${players.length === 0 ? "s" : ""}`}
          </Button>

          {!canStart && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              At least 1 other player must join before starting
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
