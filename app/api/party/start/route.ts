import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code } = await request.json()

    console.log("[v0] Starting quiz for party:", code)

    const party = await getParty(code)

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    const response = await fetch(`https://api.spotify.com/v1/playlists/${party.playlistId}/tracks`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (!response.ok) {
      console.error("[v0] Failed to fetch playlist tracks:", response.status)
      return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 })
    }

    const data = await response.json()

    const validTracks = data.items
      .map((item: any) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((a: any) => a.name),
        previewUrl: item.track.preview_url,
      }))
      .filter((track: any) => track.previewUrl)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)

    console.log("[v0] Fetched and randomized", validTracks.length, "tracks")

    const updatedParty = await updateParty(code, {
      ...party,
      tracks: validTracks,
      status: "playing",
      currentTrack: 0,
    })

    return NextResponse.json({ success: true, party: updatedParty })
  } catch (error) {
    console.error("[v0] Error starting quiz:", error)
    return NextResponse.json({ error: "Failed to start quiz" }, { status: 500 })
  }
}
