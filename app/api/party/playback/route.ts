import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const { code, isPlaying, trackIndex } = await request.json()

    const party = await getParty(code)
    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    party.currentTrack = trackIndex
    // Only update status if explicitly starting playback, otherwise preserve current status
    if (isPlaying) {
      party.status = "playing"
    }

    await updateParty(code, party)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating playback:", error)
    return NextResponse.json({ error: "Failed to update playback" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Party code required" }, { status: 400 })
    }

    const party = await getParty(code)
    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    return NextResponse.json({
      isPlaying: party.status === "playing",
      trackIndex: party.currentTrack || 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching playback:", error)
    return NextResponse.json({ error: "Failed to fetch playback" }, { status: 500 })
  }
}
