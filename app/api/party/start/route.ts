import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"
import { getSession } from "@auth0/nextjs-auth0"
import { generateObject } from "ai"
import { z } from "zod"
import { kv } from "@vercel/kv"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      console.error("[v0] No Auth0 session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code } = await request.json()

    console.log("[v0] Starting quiz for party:", code)
    console.log("[v0] User:", session.user.sub)

    const spotifyCredentials = await kv.get<{ clientId: string; clientSecret: string; accessToken?: string }>(
      `spotify:${session.user.sub}`,
    )

    if (!spotifyCredentials?.accessToken) {
      console.error("[v0] No Spotify credentials or access token found")
      return NextResponse.json(
        { error: "Spotify not connected. Please set up your Spotify app first." },
        { status: 401 },
      )
    }

    const party = await getParty(code)

    if (!party) {
      console.error("[v0] Party not found for code:", code)
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    console.log("[v0] Party found, playlistId:", party.playlistId)

    const response = await fetch(`https://api.spotify.com/v1/playlists/${party.playlistId}/tracks`, {
      headers: {
        Authorization: `Bearer ${spotifyCredentials.accessToken}`,
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

    const rawTracks = data.items
      .filter((item: any) => item.track && item.track.id)
      .map((item: any) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((a: any) => a.name),
        uri: item.track.uri,
        previewUrl: item.track.preview_url,
        albumCover: item.track.album?.images?.[0]?.url || null,
        durationMs: item.track.duration_ms, // Store track duration in milliseconds for random playback
      }))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)

    console.log("[v0] Valid tracks:", rawTracks.length)

    if (rawTracks.length === 0) {
      console.error("[v0] No valid tracks found in playlist")
      return NextResponse.json(
        { error: "No valid tracks found in this playlist. Try a different playlist." },
        { status: 400 },
      )
    }

    console.log("[v0] Generating answer options for tracks...")
    const tracksWithOptions = await Promise.all(
      rawTracks.map(async (track) => {
        try {
          const correctArtist = track.artists[0] // Use first artist as the correct answer

          const { object } = await generateObject({
            model: "openai/gpt-4o-mini",
            schema: z.object({
              similarArtists: z.array(z.string()).length(5),
            }),
            prompt: `You are a music expert. The correct answer is "${correctArtist}".
            Generate exactly 5 REAL music artists that are similar to "${correctArtist}" in terms of:
            - Musical genre or style
            - Era or time period
            - Popularity level
            - Musical approach or sound
            
            Requirements:
            - Must be real, well-known artists that actually exist
            - Should be plausible wrong answers (similar enough to be confusing)
            - Should NOT include "${correctArtist}" themselves
            - Should NOT include any artists that are in the song (${track.artists.join(", ")})
            - Return only artist names, no explanations or numbering
            
            Example: If the artist is "Taylor Swift", you might return artists like "Ariana Grande", "Katy Perry", "Dua Lipa", "Selena Gomez", "Billie Eilish"`,
          })

          // Shuffle correct answer with AI-generated options
          const allOptions = [correctArtist, ...object.similarArtists].sort(() => Math.random() - 0.5)

          return {
            ...track,
            answerOptions: allOptions,
          }
        } catch (error) {
          console.error("[v0] Error generating options for track:", track.name, error)
          // Fallback to just the correct artist if AI fails
          return {
            ...track,
            answerOptions: [track.artists[0]],
          }
        }
      }),
    )

    console.log("[v0] Generated answer options for all tracks")

    const updatedParty = await updateParty(code, {
      ...party,
      tracks: tracksWithOptions,
      status: "playing",
      currentTrack: 0,
      phase: "playing",
      playerAnswers: {},
    })

    console.log("[v0] Party updated successfully with", tracksWithOptions.length, "tracks")
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
