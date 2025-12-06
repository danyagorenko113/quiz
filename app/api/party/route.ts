import { type NextRequest, NextResponse } from "next/server"
import { createParty, getParty, updateParty } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, playlistId, host, hostEmail, maxPlayers } = body

    console.log("[v0] Creating party:", { code, playlistId, host })

    const party = await createParty({
      code,
      hostId: hostEmail || host,
      playlistId,
      playlistName: "",
      players: [],
      status: "waiting",
      tracks: [],
      currentTrack: 0,
    })

    console.log("[v0] Party created successfully in Redis:", party)

    return NextResponse.json({ success: true, party })
  } catch (error) {
    console.error("[v0] Error creating party:", error)
    return NextResponse.json({ error: "Failed to create party" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")

  console.log("[v0] GET /api/party - Fetching party with code:", code)

  if (!code) {
    return NextResponse.json({ error: "Party code required" }, { status: 400 })
  }

  const party = await getParty(code)

  if (!party) {
    console.log("[v0] Party not found in Redis for code:", code)
    return NextResponse.json({ error: "Party not found" }, { status: 404 })
  }

  console.log("[v0] Party found successfully:", party)

  return NextResponse.json({ party })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, ...updates } = body

    console.log("[v0] Updating party:", { code, updates })

    const existingParty = await getParty(code)

    if (!existingParty) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    const updatedParty = await updateParty(code, { ...existingParty, ...updates })

    console.log("[v0] Party updated in Redis:", updatedParty)

    return NextResponse.json({ success: true, party: updatedParty })
  } catch (error) {
    console.error("[v0] Error updating party:", error)
    return NextResponse.json({ error: "Failed to update party" }, { status: 500 })
  }
}
