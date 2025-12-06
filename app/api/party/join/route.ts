import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, playerName } = body

    console.log("[v0] Player joining party:", { code, playerName })

    const party = await getParty(code)

    if (!party) {
      console.log("[v0] Party not found in Redis for code:", code)
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    if (party.players.length >= 4) {
      // 4 players + 1 host = 5 total
      return NextResponse.json({ error: "Party is full" }, { status: 400 })
    }

    const nameExists = party.players.some((p) => p.name === playerName)
    if (nameExists) {
      return NextResponse.json({ error: "Name already taken" }, { status: 400 })
    }

    const newPlayer = {
      id: `${Date.now()}-${Math.random()}`,
      name: playerName,
      score: 0,
    }

    party.players.push(newPlayer)
    const updatedParty = await updateParty(code, party)

    console.log("[v0] Player joined successfully, updated in Redis:", updatedParty)

    return NextResponse.json({ success: true, party: updatedParty })
  } catch (error) {
    console.error("[v0] Error joining party:", error)
    return NextResponse.json({ error: "Failed to join party" }, { status: 500 })
  }
}
