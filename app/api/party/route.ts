import { type NextRequest, NextResponse } from "next/server"

// In-memory storage (will reset on deployment, but works for demo)
const parties = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, playlistId, host, hostEmail, maxPlayers } = body

    const partyData = {
      code,
      playlistId,
      host,
      hostEmail,
      createdAt: Date.now(),
      players: [],
      status: "waiting",
      maxPlayers: maxPlayers || 5,
    }

    parties.set(code, partyData)

    return NextResponse.json({ success: true, party: partyData })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create party" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.json({ error: "Party code required" }, { status: 400 })
  }

  const party = parties.get(code)

  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 })
  }

  return NextResponse.json({ party })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, ...updates } = body

    const party = parties.get(code)

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    const updatedParty = { ...party, ...updates }
    parties.set(code, updatedParty)

    return NextResponse.json({ success: true, party: updatedParty })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update party" }, { status: 500 })
  }
}
