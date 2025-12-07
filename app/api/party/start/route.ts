import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      console.error("[v0] No session or access token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code } = await request.json()

    console.log("[v0] Starting quiz for party:", code)
    console.log("[v0] Session access token exists:", !!session.accessToken)

    const party = await getParty(code)

    if (!party) {
      console.error("[v0] Party not found for code:", code)
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    console.log("[v0] Party found, playlistId:", party.playlistId)

    const response = await fetch(`https://api.spotify.com/v1/playlists/${party.playlistId}/tracks`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    console.log("[v0] Spotify API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Failed to fetch playlist tracks:", response.status, errorText)
      return NextResponse.json({ error: "Failed to fetch tracks from Spotify", details: errorText }, { status: 500 })
    }

    const data = await response.json()
    console.log("[v0] Raw Spotify data items count:", data.items?.length)

    const validTracks = data.items
      .filter((item: any) => item.track && item.track.id) // Only filter out null tracks
      .map((item: any) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((a: any) => a.name),
        uri: item.track.uri, // Add Spotify URI for playback
        previewUrl: item.track.preview_url, // Keep this for fallback
      }))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)

    console.log("[v0] Valid tracks:", validTracks.length)

    if (validTracks.length === 0) {
      console.error("[v0] No valid tracks found in playlist")
      return NextResponse.json(
        { error: "No valid tracks found in this playlist. Try a different playlist." },
        { status: 400 },
      )
    }

    const updatedParty = await updateParty(code, {
      ...party,
      tracks: validTracks,
      status: "playing",
      currentTrack: 0,
    })

    console.log("[v0] Party updated successfully with", validTracks.length, "tracks")
    console.log("[v0] Updated party status:", updatedParty?.status)

    return NextResponse.json({ success: true, party: updatedParty })
  } catch (error) {
    console.error("[v0] Error starting quiz:", error)
    return NextResponse.json(
      { error: "Failed to start quiz", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
