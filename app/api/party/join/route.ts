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

    if (party.players.length >= (party.maxPlayers || 5) - 1) {
      return NextResponse.json({ error: "Party is full" }, { status: 400 })
    }

    const nameExists = party.players.some((p) => {
      if (typeof p === "string") return p === playerName
      return p.name === playerName
    })

    if (nameExists) {
      return NextResponse.json({ error: "Name already taken" }, { status: 400 })
    }

    party.players.push(playerName)
    const updatedParty = await updateParty(code, party)

    console.log("[v0] Player joined successfully, updated in Redis:", updatedParty)

    return NextResponse.json({ success: true, party: updatedParty })
  } catch (error) {
    console.error("[v0] Error joining party:", error)
    return NextResponse.json({ error: "Failed to join party" }, { status: 500 })
  }
}
