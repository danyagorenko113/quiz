import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface Party {
  code: string
  host?: string
  hostId: string
  hostEmail?: string
  playlistId: string
  playlistName: string
  players: (string | Player)[]
  status: "waiting" | "playing" | "finished"
  tracks: Track[]
  currentTrack: number
  maxPlayers?: number
  currentTrackAnswers?: Record<string, boolean>
}

export interface Player {
  id: string
  name: string
  score: number
}

export interface Track {
  id: string
  name: string
  artists: string[]
  previewUrl: string | null
}

// Store party with 1 hour expiration
export async function createParty(party: Party) {
  await redis.set(`party:${party.code}`, party, { ex: 3600 })
  console.log("[v0] Created party in Redis:", party.code)
  return party
}

// Get party by code
export async function getParty(code: string): Promise<Party | null> {
  const party = await redis.get<Party>(`party:${code}`)
  console.log("[v0] Retrieved party from Redis:", code, party ? "found" : "not found")
  return party
}

// Update party
export async function updateParty(code: string, party: Party) {
  await redis.set(`party:${code}`, party, { ex: 3600 })
  console.log("[v0] Updated party in Redis:", code)
  return party
}

// Delete party
export async function deleteParty(code: string) {
  await redis.del(`party:${code}`)
  console.log("[v0] Deleted party from Redis:", code)
}
