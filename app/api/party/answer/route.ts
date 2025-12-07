import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const { code, playerName, guess, trackIndex } = await request.json()

    console.log("[v0] Submitting answer:", { code, playerName, guess, trackIndex })

    const party = await getParty(code)

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    if (playerName === party.host) {
      return NextResponse.json({
        correct: false,
        answer: {
          name: party.tracks[trackIndex]?.name || "",
          artists: party.tracks[trackIndex]?.artists || [],
        },
      })
    }

    const track = party.tracks[trackIndex]
    if (!track) {
      return NextResponse.json({ error: "Invalid track" }, { status: 400 })
    }

    const correctArtist = track.artists[0]
    const isCorrect = guess.trim() === correctArtist

    if (!party.currentTrackAnswers) {
      party.currentTrackAnswers = {}
    }
    party.currentTrackAnswers[playerName] = isCorrect

    if (!party.playerAnswers) {
      party.playerAnswers = {}
    }
    party.playerAnswers[playerName] = guess.trim()

    await updateParty(code, party)

    return NextResponse.json({
      correct: isCorrect,
      answer: {
        name: track.name,
        artists: track.artists,
      },
    })
  } catch (error) {
    console.error("[v0] Error submitting answer:", error)
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 })
  }
}
