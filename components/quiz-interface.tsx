"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Music, Play, Pause, Users, Trophy } from "lucide-react"
import { useSession } from "next-auth/react"

interface Track {
  id: string
  name: string
  artists: string[]
  uri: string
  previewUrl: string | null
}

export function QuizInterface({ partyCode }: { partyCode: string }) {
  const { data: session } = useSession()
  const [partyData, setPartyData] = useState<any>(null)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [guess, setGuess] = useState("")
  const [score, setScore] = useState(0)
  const [hasGuessed, setHasGuessed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playerName, setPlayerName] = useState<string>("")
  const [isWaiting, setIsWaiting] = useState(true)
  const [player, setPlayer] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!session?.accessToken) return

    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "Spotify Quiz Player",
        getOAuthToken: (cb: (token: string) => void) => {
          cb(session.accessToken as string)
        },
        volume: 0.5,
      })

      spotifyPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("[v0] Spotify player ready with device ID:", device_id)
        setDeviceId(device_id)
      })

      spotifyPlayer.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        console.log("[v0] Device ID has gone offline", device_id)
      })

      spotifyPlayer.connect()
      setPlayer(spotifyPlayer)
    }

    return () => {
      if (player) {
        player.disconnect()
      }
    }
  }, [session])

  useEffect(() => {
    const fetchPartyData = async () => {
      try {
        const response = await fetch(`/api/party?code=${partyCode}`)

        if (response.ok) {
          const data = await response.json()
          const party = data.party
          setPartyData(party)

          if (party.status === "playing") {
            setIsWaiting(false)
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching party:", error)
      }
      setLoading(false)
    }

    const storedPlayerName = localStorage.getItem("playerName")
    if (storedPlayerName) {
      setPlayerName(storedPlayerName)
    }

    fetchPartyData()

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchPartyData, 2000)

    return () => clearInterval(interval)
  }, [partyCode])

  const playTrack = async () => {
    if (!partyData?.tracks[currentTrackIndex]) return

    const track = partyData.tracks[currentTrackIndex]

    // Try Spotify Web Playback SDK first (for host with session)
    if (session?.accessToken && deviceId && track.uri) {
      try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [track.uri],
            position_ms: 0,
          }),
        })

        if (response.ok || response.status === 204) {
          setIsPlaying(true)

          // Stop after 10 seconds
          playbackTimerRef.current = setTimeout(() => {
            pauseTrack()
          }, 10000)
          return
        }
      } catch (error) {
        console.error("[v0] Error playing with Spotify SDK:", error)
      }
    }

    // Fallback to preview URL if available
    if (audioRef.current && track.previewUrl) {
      audioRef.current.src = track.previewUrl
      audioRef.current.play()
      setIsPlaying(true)

      // Stop after 10 seconds
      playbackTimerRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause()
          setIsPlaying(false)
        }
      }, 10000)
    }
  }

  const pauseTrack = async () => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current)
      playbackTimerRef.current = null
    }

    if (session?.accessToken && deviceId) {
      try {
        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
      } catch (error) {
        console.error("[v0] Error pausing Spotify player:", error)
      }
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    setIsPlaying(false)
  }

  const submitGuess = async () => {
    if (!guess.trim()) return

    try {
      const response = await fetch("/api/party/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: partyCode,
          playerName,
          guess,
          trackIndex: currentTrackIndex,
        }),
      })

      const data = await response.json()

      if (data.correct) {
        setScore(score + 1)
      }

      setAnswer(data.answer)
      setHasGuessed(true)
      pauseTrack()
    } catch (error) {
      console.error("[v0] Error submitting guess:", error)
    }
  }

  const nextTrack = () => {
    const tracks = partyData?.tracks || []
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1)
      setGuess("")
      setHasGuessed(false)
      setAnswer(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    )
  }

  if (!partyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Party Not Found</h2>
          <p className="text-muted-foreground">Check your party code and try again.</p>
        </Card>
      </div>
    )
  }

  if (isWaiting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
        <div className="max-w-2xl mx-auto py-8">
          <Card className="p-8 bg-background/95 backdrop-blur">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Waiting Room</h1>
              <p className="text-muted-foreground mb-6">
                Party Code: <span className="font-bold text-2xl">{partyCode}</span>
              </p>

              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">Players in Lobby</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border-2 border-emerald-500">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                      H
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{partyData.host}</p>
                      <p className="text-xs text-muted-foreground">Host</p>
                    </div>
                  </div>

                  {partyData.players?.map((player: string | { name: string }, index: number) => {
                    const playerName = typeof player === "string" ? player : player.name
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold">
                          {playerName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold">{playerName}</p>
                          <p className="text-xs text-muted-foreground">Player</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <p className="text-muted-foreground animate-pulse">Waiting for host to start the quiz...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const tracks = partyData?.tracks || []

  if (tracks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center">
        <p className="text-white text-xl">Loading tracks...</p>
      </div>
    )
  }

  const currentTrack = tracks[currentTrackIndex]
  const isQuizComplete = currentTrackIndex >= tracks.length

  if (isQuizComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center bg-background/95 backdrop-blur">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-5xl font-bold text-emerald-600 my-6">
            {score} / {tracks.length}
          </p>
          <p className="text-muted-foreground mb-6">
            Great job! You got {score} out of {tracks.length} correct.
          </p>
          <Button
            onClick={() => (window.location.href = "/host")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Start New Quiz
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="text-white">
            <p className="text-sm opacity-80">Party Code</p>
            <p className="text-2xl font-bold">{partyCode}</p>
          </div>
          <div className="text-right text-white">
            <p className="text-sm opacity-80">Score</p>
            <p className="text-2xl font-bold">
              {score} / {currentTrackIndex}
            </p>
          </div>
        </div>

        <Card className="p-8 bg-background/95 backdrop-blur">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Music className="w-4 h-4" />
              Track {currentTrackIndex + 1} of {tracks.length}
            </div>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-6">
              <Music className="w-16 h-16 text-white" />
            </div>
          </div>

          {!hasGuessed ? (
            <div className="space-y-6">
              <div className="flex justify-center gap-4">
                {!isPlaying ? (
                  <Button
                    onClick={playTrack}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Play 10 Seconds
                  </Button>
                ) : (
                  <Button onClick={pauseTrack} size="lg" variant="outline" className="gap-2 bg-transparent">
                    <Pause className="w-5 h-5" />
                    Pause
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your Guess (Artist and Song Name)</label>
                <Input
                  type="text"
                  placeholder="e.g., Taylor Swift - Shake It Off"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                  className="text-lg"
                />
              </div>

              <Button
                onClick={submitGuess}
                disabled={!guess.trim()}
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Submit Guess
              </Button>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-2">Correct Answer</p>
                <p className="text-xl font-bold">{answer?.name}</p>
                <p className="text-lg text-muted-foreground">by {answer?.artists.join(", ")}</p>
              </div>

              <Button onClick={nextTrack} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Next Track
              </Button>
            </div>
          )}
        </Card>

        <audio ref={audioRef} />
      </div>
    </div>
  )
}
