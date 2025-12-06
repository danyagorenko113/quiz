"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Music, Play, Pause, Users, Trophy, Share2 } from "lucide-react"
import { useSession } from "next-auth/react"

interface Track {
  id: string
  name: string
  artists: { name: string }[]
  preview_url: string | null
}

export function QuizInterface({ partyCode }: { partyCode: string }) {
  const { data: session } = useSession()
  const [partyData, setPartyData] = useState<any>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [guess, setGuess] = useState("")
  const [score, setScore] = useState(0)
  const [hasGuessed, setHasGuessed] = useState(false)
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    // Load party data
    const data = localStorage.getItem(`party_${partyCode}`)
    if (data) {
      const party = JSON.parse(data)
      setPartyData(party)

      // Fetch playlist tracks if host
      if (session?.accessToken) {
        fetchPlaylistTracks(party.playlistId, session.accessToken)
      }
    }
    setLoading(false)
  }, [partyCode, session])

  const fetchPlaylistTracks = async (playlistId: string, token: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()

      // Filter tracks with preview URLs and shuffle
      const validTracks = data.items
        .map((item: any) => item.track)
        .filter((track: Track) => track.preview_url)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)

      setTracks(validTracks)
    } catch (error) {
      console.error("[v0] Error fetching tracks:", error)
    }
  }

  const playTrack = () => {
    if (audioRef.current && tracks[currentTrackIndex]) {
      audioRef.current.src = tracks[currentTrackIndex].preview_url!
      audioRef.current.play()
      setIsPlaying(true)

      // Stop after 10 seconds
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause()
          setIsPlaying(false)
        }
      }, 10000)
    }
  }

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const submitGuess = () => {
    if (!tracks[currentTrackIndex]) return

    const currentTrack = tracks[currentTrackIndex]
    const correctAnswer = `${currentTrack.name} - ${currentTrack.artists[0].name}`.toLowerCase()
    const userGuess = guess.toLowerCase()

    // Simple matching - check if guess contains song name or artist
    const isCorrect =
      correctAnswer.includes(userGuess) ||
      userGuess.includes(currentTrack.name.toLowerCase()) ||
      userGuess.includes(currentTrack.artists[0].name.toLowerCase())

    if (isCorrect) {
      setScore(score + 1)
    }

    setHasGuessed(true)
    pauseTrack()
  }

  const nextTrack = () => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1)
      setGuess("")
      setHasGuessed(false)
    }
  }

  const copyInviteLink = () => {
    const url = `${window.location.origin}/join`
    navigator.clipboard.writeText(`Join my Spotify Quiz! Code: ${partyCode}\n${url}`)
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

  if (tracks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
        <div className="max-w-2xl mx-auto py-8">
          <Card className="p-8 text-center bg-background/95 backdrop-blur">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Party: {partyCode}</h2>
            <p className="text-muted-foreground mb-6">Waiting for host to start the quiz...</p>
            <Button onClick={copyInviteLink} variant="outline" className="gap-2 bg-transparent">
              <Share2 className="w-4 h-4" />
              Share Invite Code
            </Button>
          </Card>
        </div>
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
                <label className="text-sm font-medium">Your Guess</label>
                <Input
                  type="text"
                  placeholder="Song name or artist..."
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
                <p className="text-xl font-bold">{currentTrack.name}</p>
                <p className="text-lg text-muted-foreground">by {currentTrack.artists.map((a) => a.name).join(", ")}</p>
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
