import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    console.log("[v0] Moving to next track for party:", code)

    const party = await getParty(code)

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    party.currentTrack = (party.currentTrack || 0) + 1
    party.currentTrackAnswers = {}
    party.playerAnswers = {}
    party.phase = "playing"

    await updateParty(code, party)

    return NextResponse.json({ success: true, currentTrack: party.currentTrack })
  } catch (error) {
    console.error("[v0] Error moving to next track:", error)
    return NextResponse.json({ error: "Failed to move to next track" }, { status: 500 })
  }
}
