import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    console.log("[v0] Finishing game immediately for party:", code)

    const party = await getParty(code)

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    // Set party status to finished regardless of current track
    party.status = "finished"

    await updateParty(code, party)

    console.log("[v0] Game finished successfully")

    return NextResponse.json({ success: true, finished: true })
  } catch (error) {
    console.error("[v0] Error finishing game:", error)
    return NextResponse.json({ error: "Failed to finish game" }, { status: 500 })
  }
}
