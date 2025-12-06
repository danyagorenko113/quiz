import { type NextRequest, NextResponse } from "next/server"
import { getParty, addPlayer } from "@/lib/party-storage"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, playerName } = body

    console.log("[v0] Player joining party:", { code, playerName })

    const party = getParty(code)

    if (!party) {
      console.log("[v0] Party not found for code:", code)
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    if (party.players && party.players.length >= party.maxPlayers - 1) {
      return NextResponse.json({ error: "Party is full" }, { status: 400 })
    }

    const nameExists = party.players?.some((p) => p.name === playerName)
    if (nameExists) {
      return NextResponse.json({ error: "Name already taken" }, { status: 400 })
    }

    const updatedParty = addPlayer(code, playerName)

    console.log("[v0] Player joined successfully:", updatedParty)

    return NextResponse.json({ success: true, party: updatedParty })
  } catch (error) {
    console.error("[v0] Error joining party:", error)
    return NextResponse.json({ error: "Failed to join party" }, { status: 500 })
  }
}
