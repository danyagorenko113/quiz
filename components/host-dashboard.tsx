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

  const handleStartParty = () => {
    if (!selectedPlaylist) return

    // Generate random party code
    const partyCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Store party data in localStorage
    const partyData = {
      code: partyCode,
      playlistId: selectedPlaylist,
      host: session.user?.name,
      createdAt: Date.now(),
    }

    localStorage.setItem(`party_${partyCode}`, JSON.stringify(partyData))
    localStorage.setItem("currentParty", partyCode)

    // Redirect to quiz
    window.location.href = `/quiz/${partyCode}`
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
