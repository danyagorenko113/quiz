"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Music, Play, Pause, Users, Trophy, CheckCircle, Clock, XCircle } from "lucide-react"
import { useSession } from "next-auth/react"

interface Track {
  id: string
  name: string
  artists: string[]
  uri: string
  previewUrl: string | null
  answerOptions?: string[]
  albumCover?: string
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
  const [isHost, setIsHost] = useState(false)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [allMembersAnswered, setAllMembersAnswered] = useState(false)
  const [phase, setPhase] = useState<"playing" | "results">("playing")

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

          if (session?.user?.email === party.hostEmail) {
            setIsHost(true)
          }

          if (party.status === "playing") {
            setIsWaiting(false)
          }

          // Only reset input when track actually changes to a NEW track
          if (!isHost && party.currentTrack !== undefined) {
            setCurrentTrackIndex((prevIndex) => {
              if (party.currentTrack !== prevIndex) {
                // Track changed - reset the form
                setGuess("")
                setHasGuessed(false)
                setAnswer(null)
                setAnswerSubmitted(false)
                return party.currentTrack
              }
              return prevIndex
            })
          }

          // Check if all members have answered
          const players = getPlayerList()
          const answeredPlayers = Object.keys(party?.currentTrackAnswers || {})
          setAllMembersAnswered(answeredPlayers.length === players.length)
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

    const interval = setInterval(fetchPartyData, 2000)

    return () => clearInterval(interval)
  }, [partyCode, session, isHost])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/party?code=${partyCode}`)
        if (response.ok) {
          const data = await response.json()
          setPartyData(data.party)

          if (data.party.phase) {
            setPhase(data.party.phase)
          }

          if (data.party.currentTrack !== currentTrackIndex) {
            setCurrentTrackIndex(data.party.currentTrack)
            setGuess("")
            setHasGuessed(false)
            setAnswer(null)
            setAnswerSubmitted(false)
            setPhase("playing")
          }
        }
      } catch (error) {
        console.error("[v0] Error polling party data:", error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [partyCode, currentTrackIndex])

  const playTrack = async () => {
    if (!partyData?.tracks[currentTrackIndex]) return

    const track = partyData.tracks[currentTrackIndex]

    if (isHost && session?.accessToken && deviceId && track.uri) {
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

          await fetch("/api/party/playback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: partyCode,
              isPlaying: true,
              trackIndex: currentTrackIndex,
            }),
          })

          playbackTimerRef.current = setTimeout(() => {
            pauseTrack()
          }, 10000)
          return
        }
      } catch (error) {
        console.error("[v0] Error playing with Spotify SDK:", error)
      }
    }

    if (!isHost && track.previewUrl && audioRef.current) {
      audioRef.current.src = track.previewUrl
      audioRef.current.currentTime = 0

      try {
        await audioRef.current.play()
        setIsPlaying(true)

        playbackTimerRef.current = setTimeout(() => {
          pauseTrack()
        }, 10000)
      } catch (error) {
        console.error("[v0] Error playing preview:", error)
        alert("Unable to play audio. Please ensure your browser allows audio playback.")
      }
    } else if (!isHost && !track.previewUrl) {
      alert("This track doesn't have a preview available. Listen from the host's device!")
    }
  }

  const pauseTrack = async () => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current)
      playbackTimerRef.current = null
    }

    if (isHost && session?.accessToken && deviceId) {
      try {
        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })

        await fetch("/api/party/playback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: partyCode,
            isPlaying: false,
            trackIndex: currentTrackIndex,
          }),
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

  const submitGuess = async (selectedArtist?: string) => {
    const guessToSubmit = selectedArtist || guess
    if (!guessToSubmit.trim()) return

    try {
      const response = await fetch("/api/party/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: partyCode,
          playerName,
          guess: guessToSubmit,
          trackIndex: currentTrackIndex,
        }),
      })

      const data = await response.json()

      if (data.correct) {
        setScore(score + 1)
      }

      setAnswer(data.answer)
      setHasGuessed(true)
      if (!isHost) {
        setAnswerSubmitted(true)
      }
      pauseTrack()
    } catch (error) {
      console.error("[v0] Error submitting guess:", error)
    }
  }

  const finishRound = async () => {
    if (!isHost) return

    try {
      await fetch("/api/party/finish-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: partyCode }),
      })
    } catch (error) {
      console.error("[v0] Error finishing round:", error)
    }
  }

  const nextTrack = async () => {
    if (!isHost) return

    try {
      await fetch("/api/party/next-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: partyCode }),
      })

      const tracks = partyData?.tracks || []
      if (currentTrackIndex < tracks.length - 1) {
        setCurrentTrackIndex(currentTrackIndex + 1)
        setGuess("")
        setHasGuessed(false)
        setAnswer(null)
        setAnswerSubmitted(false)
        setPhase("playing")
      }
    } catch (error) {
      console.error("[v0] Error advancing track:", error)
    }
  }

  const getPlayerList = () => {
    const players: string[] = []
    if (partyData?.players) {
      partyData.players.forEach((p: string | { name: string }) => {
        const name = typeof p === "string" ? p : p.name
        if (name) players.push(name)
      })
    }
    return players
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

  const isQuizComplete = partyData?.status === "finished"

  if (isQuizComplete) {
    const sortedPlayers = [...(partyData?.players || [])]
      .filter((p: any) => typeof p === "object" && p.name !== partyData?.host)
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 bg-background/95 backdrop-blur">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-muted-foreground">{partyData.tracks.length} tracks • Final Results</p>
          </div>

          <div className="space-y-3 mb-6">
            {sortedPlayers.map((player: any, index: number) => {
              const isCurrentPlayer = player.name === playerName
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null

              return (
                <div
                  key={player.id || player.name}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentPlayer
                      ? "bg-emerald-500/20 border-emerald-500"
                      : index === 0
                        ? "bg-yellow-500/10 border-yellow-500/50"
                        : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg">
                        {medal || `#${index + 1}`}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {player.name}
                          {isCurrentPlayer && <span className="ml-2 text-xs text-emerald-600 font-normal">(You)</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {player.score || 0} / {partyData.tracks.length} correct
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">{player.score || 0}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {isHost && (
            <Button
              onClick={() => (window.location.href = "/host")}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              size="lg"
            >
              <Music className="w-4 h-4 mr-2" />
              Start New Quiz
            </Button>
          )}
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

  if (phase === "results" && partyData) {
    const currentTrack = tracks[currentTrackIndex]
    const playerAnswers = partyData.playerAnswers || {}
    const correctAnswers = partyData.currentTrackAnswers || {}
    const myAnswer = playerAnswers[playerName]
    const isMyAnswerCorrect = correctAnswers[playerName]

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl p-8 bg-background/95 backdrop-blur">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Round Results</h2>
            <p className="text-muted-foreground">
              Track {currentTrackIndex + 1} of {tracks.length}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 mb-8">
            {currentTrack.albumCover && (
              <img
                src={currentTrack.albumCover || "/placeholder.svg"}
                alt={currentTrack.name}
                className="w-48 h-48 rounded-lg shadow-lg"
              />
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Correct Answer</p>
              <h3 className="text-2xl font-bold">{currentTrack.name}</h3>
              <p className="text-xl text-emerald-600 font-semibold mt-1">by {currentTrack.artists.join(", ")}</p>
            </div>
          </div>

          {isHost ? (
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Player Answers
              </h4>
              <div className="space-y-2">
                {getPlayerList().map((player, index) => {
                  const playerAnswer = playerAnswers[player]
                  const isCorrect = correctAnswers[player]
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        isCorrect
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500"
                          : "bg-red-50 dark:bg-red-950/30 border-2 border-red-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              isCorrect ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          >
                            {player[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{player}</p>
                            <p className="text-sm text-muted-foreground">
                              Answered: <span className="font-medium">{playerAnswer || "No answer"}</span>
                            </p>
                          </div>
                        </div>
                        {isCorrect ? (
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div
                className={`p-6 rounded-lg text-center ${
                  isMyAnswerCorrect
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500"
                    : "bg-red-50 dark:bg-red-950/30 border-2 border-red-500"
                }`}
              >
                {isMyAnswerCorrect ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-emerald-700 mb-2">Correct!</h3>
                    <p className="text-muted-foreground">You guessed: {myAnswer}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-600 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-red-700 mb-2">Wrong Answer</h3>
                    <p className="text-muted-foreground">You guessed: {myAnswer}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {isHost && (
            <Button
              onClick={nextTrack}
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={currentTrackIndex >= tracks.length - 1}
            >
              {currentTrackIndex >= tracks.length - 1 ? "Quiz Complete!" : "Next Track"}
            </Button>
          )}

          {!isHost && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Waiting for host to continue...</p>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
      <div className="max-w-6xl mx-auto py-8">
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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-8 bg-background/95 backdrop-blur">
              <div className="text-center mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${isHost ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}
                >
                  {isHost ? "🎵 Host (Controls Music)" : "👥 Player"}
                </span>
              </div>

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

                  {!isHost && !tracks[currentTrackIndex].previewUrl && (
                    <p className="text-center text-sm text-muted-foreground">
                      ⚠️ This track doesn't have a preview. Listen from the host's device!
                    </p>
                  )}

                  {!isHost && (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Who is the artist?</label>
                        <div className="grid grid-cols-2 gap-3">
                          {tracks[currentTrackIndex]?.answerOptions?.map((artist, index) => (
                            <Button
                              key={index}
                              onClick={() => submitGuess(artist)}
                              variant="outline"
                              size="lg"
                              className="h-auto py-4 text-base font-medium hover:bg-emerald-50 hover:border-emerald-600 hover:text-emerald-700"
                            >
                              {artist}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  {!isHost && answerSubmitted ? (
                    <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-500">
                      <Clock className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-pulse" />
                      <p className="text-lg font-semibold mb-2">Answer Submitted!</p>
                      <p className="text-sm text-muted-foreground">Waiting for host to finish the round...</p>
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          </div>

          {isHost && (
            <div className="lg:col-span-1">
              <Card className="p-6 bg-background/95 backdrop-blur">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-lg">Player Status</h3>
                </div>
                <div className="space-y-2">
                  {getPlayerList().map((player, index) => {
                    const hasAnswered = partyData?.currentTrackAnswers?.[player] || false
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          hasAnswered ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500" : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              hasAnswered ? "bg-emerald-600" : "bg-gray-400"
                            }`}
                          >
                            {player[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{player}</span>
                        </div>
                        {hasAnswered ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {allMembersAnswered && (
                  <Button
                    onClick={finishRound}
                    size="lg"
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Finish Round
                  </Button>
                )}
              </Card>
            </div>
          )}
        </div>

        <audio ref={audioRef} />
      </div>
    </div>
  )
}
