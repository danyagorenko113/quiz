import { type NextRequest, NextResponse } from "next/server"

// Same in-memory storage reference
const parties = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, playerName } = body

    const party = parties.get(code)

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    if (party.players && party.players.length >= party.maxPlayers - 1) {
      return NextResponse.json({ error: "Party is full" }, { status: 400 })
    }

    if (party.players && party.players.includes(playerName)) {
      return NextResponse.json({ error: "Name already taken" }, { status: 400 })
    }

    if (!party.players) {
      party.players = []
    }
    party.players.push(playerName)
    parties.set(code, party)

    return NextResponse.json({ success: true, party })
  } catch (error) {
    return NextResponse.json({ error: "Failed to join party" }, { status: 500 })
  }
}
