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

interface Player {
  id: string
  name: string
  score: number
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

  const finishGame = async () => {
    if (!isHost) return

    try {
      await fetch("/api/party/finish-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: partyCode }),
      })
    } catch (error) {
      console.error("[v0] Error finishing game:", error)
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

  const completeQuiz = async () => {
    if (!isHost) return

    try {
      await fetch("/api/party/next-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: partyCode }),
      })
    } catch (error) {
      console.error("[v0] Error completing quiz:", error)
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="p-8 text-center bg-zinc-900/80 border-zinc-800">
          <h2 className="text-2xl font-bold mb-2 text-white">Party Not Found</h2>
          <p className="text-gray-400">Check your party code and try again.</p>
        </Card>
      </div>
    )
  }

  const isQuizComplete = partyData?.status === "finished"

  if (isQuizComplete) {
    const normalizedPlayers = partyData.players.map((p: string | Player) => {
      if (typeof p === "string") {
        return { id: p, name: p, score: 0 }
      }
      return p
    })

    const sortedPlayers = [...normalizedPlayers]
      .filter((p: Player) => p.name !== partyData?.host)
      .sort((a: Player, b: Player) => (b.score || 0) - (a.score || 0))

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 bg-zinc-900/80 backdrop-blur border-zinc-800">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f89dcf] via-[#fc4839] to-[#20d760] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(252,72,57,0.5)]">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-2 text-white">Quiz Complete!</h2>
            <p className="text-gray-400">{partyData.tracks.length} tracks • Final Results</p>
          </div>

          <div className="space-y-3 mb-6">
            {sortedPlayers.map((player: Player, index: number) => {
              const isCurrentPlayer = player.name === playerName
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null

              return (
                <div
                  key={player.id || player.name}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentPlayer
                      ? "bg-[#20d760]/20 border-[#20d760]"
                      : index === 0
                        ? "bg-[#f89dcf]/10 border-[#f89dcf]/50"
                        : "bg-zinc-800/50 border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-lg text-white border border-zinc-700">
                        {medal || `#${index + 1}`}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {player.name}
                          {isCurrentPlayer && <span className="ml-2 text-xs text-[#20d760] font-normal">(You)</span>}
                        </p>
                        <p className="text-sm text-gray-400">
                          {player.score || 0} / {partyData.tracks.length} correct
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#20d760]">{player.score || 0}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {isHost && (
            <Button
              onClick={() => (window.location.href = "/host")}
              className="w-full bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold shadow-[0_0_20px_rgba(32,215,96,0.5)]"
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

  if (partyData.status === "waiting" || partyData.status === "lobby") {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-2xl mx-auto py-8">
          <Card className="p-8 bg-zinc-900/80 backdrop-blur border-zinc-800">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#20d760] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(32,215,96,0.6)]">
                <Users className="w-10 h-10 text-black" />
              </div>
              <h1 className="text-3xl font-bold mb-2 text-white">Waiting Room</h1>
              <p className="text-gray-400 mb-6">
                Party Code: <span className="font-bold text-2xl text-[#20d760]">{partyCode}</span>
              </p>

              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4 text-white">Players in Lobby</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-[#20d760]/10 rounded-lg border-2 border-[#20d760]">
                    <div className="w-10 h-10 rounded-full bg-[#20d760] flex items-center justify-center text-black font-bold">
                      H
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white">{partyData.host}</p>
                      <p className="text-xs text-gray-400">Host</p>
                    </div>
                  </div>

                  {partyData.players?.map((player: string | { name: string }, index: number) => {
                    const playerName = typeof player === "string" ? player : player.name
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#01fffe] flex items-center justify-center text-black font-bold">
                          {playerName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-white">{playerName}</p>
                          <p className="text-xs text-gray-400">Player</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <p className="text-gray-400 animate-pulse">Waiting for host to start the quiz...</p>
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
      <div className="min-h-screen bg-black p-4">
        <Card className="w-full max-w-3xl mx-auto p-8 bg-zinc-900/80 backdrop-blur border-zinc-800 mt-8">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-400">
              Track {currentTrackIndex + 1} of {tracks.length}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 mb-8">
            {currentTrack.albumCover && (
              <img
                src={currentTrack.albumCover || "/placeholder.svg"}
                alt={currentTrack.name}
                className="w-48 h-48 rounded-lg shadow-[0_0_40px_rgba(32,215,96,0.3)]"
              />
            )}
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">Correct Answer</p>
              <h3 className="text-2xl font-bold text-white">{currentTrack.name}</h3>
              <p className="text-xl text-[#20d760] font-semibold mt-1">by {currentTrack.artists.join(", ")}</p>
            </div>
          </div>

          {isHost ? (
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-lg flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-[#20d760]" />
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
                          ? "bg-[#20d760]/10 border-2 border-[#20d760]"
                          : "bg-[#fc4839]/10 border-2 border-[#fc4839]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              isCorrect ? "bg-[#20d760]" : "bg-[#fc4839]"
                            }`}
                          >
                            {player[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{player}</p>
                            <p className="text-sm text-gray-400">
                              Answered: <span className="font-medium">{playerAnswer || "No answer"}</span>
                            </p>
                          </div>
                        </div>
                        {isCorrect ? (
                          <CheckCircle className="w-6 h-6 text-[#20d760]" />
                        ) : (
                          <XCircle className="w-6 h-6 text-[#fc4839]" />
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
                    ? "bg-[#20d760]/10 border-2 border-[#20d760]"
                    : "bg-[#fc4839]/10 border-2 border-[#fc4839]"
                }`}
              >
                {isMyAnswerCorrect ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-[#20d760] mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-[#20d760] mb-2">Correct!</h3>
                    <p className="text-gray-400">You guessed: {myAnswer}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-[#fc4839] mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-[#fc4839] mb-2">Wrong Answer</h3>
                    <p className="text-gray-400">You guessed: {myAnswer}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {isHost && (
            <div className="space-y-4">
              <Button
                onClick={currentTrackIndex >= tracks.length - 1 ? completeQuiz : nextTrack}
                size="lg"
                className="w-full bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold shadow-[0_0_20px_rgba(32,215,96,0.5)]"
              >
                {currentTrackIndex >= tracks.length - 1 ? "Show Final Results" : "Next Track"}
              </Button>
              <Button
                onClick={finishGame}
                variant="outline"
                size="lg"
                className="w-full mt-2 border-[#fc4839] text-[#fc4839] hover:bg-[#fc4839]/10 bg-transparent"
              >
                Finish Game
              </Button>
            </div>
          )}

          {!isHost && (
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Waiting for host to continue...</p>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="text-white">
            <p className="text-sm text-gray-400">Party Code</p>
            <p className="text-2xl font-bold text-[#20d760]">{partyCode}</p>
          </div>
          <div className="text-right text-white">
            <p className="text-sm text-gray-400">Score</p>
            <p className="text-2xl font-bold text-[#20d760]">
              {score} / {currentTrackIndex}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-8 bg-zinc-900/80 backdrop-blur border-zinc-800">
              <div className="text-center mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${isHost ? "bg-[#20d760] text-black" : "bg-zinc-800 text-gray-300"}`}
                >
                  {isHost ? "🎵 Host (Controls Music)" : "👥 Player"}
                </span>
              </div>

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Music className="w-4 h-4" />
                  Track {currentTrackIndex + 1} of {tracks.length}
                </div>
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#20d760] to-[#01fffe] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(32,215,96,0.6)]">
                  <Music className="w-16 h-16 text-black" />
                </div>
              </div>

              {!hasGuessed ? (
                <div className="space-y-6">
                  <div className="flex justify-center gap-4">
                    {!isPlaying ? (
                      <Button
                        onClick={playTrack}
                        size="lg"
                        className="bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold gap-2 shadow-[0_0_20px_rgba(32,215,96,0.5)]"
                      >
                        <Play className="w-5 h-5" />
                        Play 10 Seconds
                      </Button>
                    ) : (
                      <Button
                        onClick={pauseTrack}
                        size="lg"
                        variant="outline"
                        className="gap-2 bg-transparent border-zinc-700 text-gray-300 hover:bg-zinc-800"
                      >
                        <Pause className="w-5 h-5" />
                        Pause
                      </Button>
                    )}
                  </div>

                  {!isHost && !tracks[currentTrackIndex].previewUrl && (
                    <p className="text-center text-sm text-gray-400">
                      ⚠️ This track doesn't have a preview. Listen from the host's device!
                    </p>
                  )}

                  {!isHost && (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Who is the artist?</label>
                        <div className="grid grid-cols-2 gap-3">
                          {tracks[currentTrackIndex]?.answerOptions?.map((artist, index) => (
                            <Button
                              key={index}
                              onClick={() => submitGuess(artist)}
                              variant="outline"
                              size="lg"
                              className="h-auto py-4 text-base font-medium bg-zinc-800/50 border-zinc-700 text-white hover:bg-[#20d760]/20 hover:border-[#20d760] hover:text-[#20d760]"
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
                    <div className="p-6 rounded-lg bg-[#01fffe]/10 border-2 border-[#01fffe]">
                      <Clock className="w-12 h-12 text-[#01fffe] mx-auto mb-3 animate-pulse" />
                      <p className="text-lg font-semibold mb-2 text-white">Answer Submitted!</p>
                      <p className="text-sm text-gray-400">Waiting for host to finish the round...</p>
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          </div>

          {isHost && (
            <div className="lg:col-span-1">
              <Card className="p-6 bg-zinc-900/80 backdrop-blur border-zinc-800">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-[#20d760]" />
                  <h3 className="font-semibold text-lg text-white">Player Status</h3>
                </div>
                <div className="space-y-2">
                  {getPlayerList().map((player, index) => {
                    const hasAnswered = partyData?.currentTrackAnswers?.[player] !== undefined
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          hasAnswered
                            ? "bg-[#20d760]/10 border border-[#20d760]"
                            : "bg-zinc-800/50 border border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              hasAnswered ? "bg-[#20d760]" : "bg-gray-600"
                            }`}
                          >
                            {player[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-sm text-white">{player}</span>
                        </div>
                        {hasAnswered ? (
                          <CheckCircle className="w-5 h-5 text-[#20d760]" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {allMembersAnswered && (
                  <Button
                    onClick={finishRound}
                    size="lg"
                    className="w-full mt-4 bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold shadow-[0_0_20px_rgba(32,215,96,0.5)]"
                  >
                    Finish Round
                  </Button>
                )}

                <Button
                  onClick={finishGame}
                  variant="outline"
                  size="lg"
                  className="w-full mt-2 border-[#fc4839] text-[#fc4839] hover:bg-[#fc4839]/10 bg-transparent"
                >
                  Finish Game
                </Button>
              </Card>
            </div>
          )}
        </div>

        <audio ref={audioRef} />
      </div>
    </div>
  )
}
