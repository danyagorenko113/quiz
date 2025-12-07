import { type NextRequest, NextResponse } from "next/server"
import { getParty, updateParty } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    console.log("[v0] Finishing round for party:", code)

    const party = await getParty(code)

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 })
    }

    party.phase = "results"
    await updateParty(code, party)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error finishing round:", error)
    return NextResponse.json({ error: "Failed to finish round" }, { status: 500 })
  }
}
