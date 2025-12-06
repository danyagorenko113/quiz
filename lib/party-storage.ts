// Simple party storage using a global variable that persists during the Node.js process
// Note: This will reset on redeployment but works for development and short sessions

interface Party {
  code: string
  playlistId: string
  host: string
  hostEmail: string
  createdAt: number
  players: Array<{ name: string; joinedAt: number }>
  status: "waiting" | "playing" | "finished"
  maxPlayers: number
  currentTrackIndex?: number
  scores?: Record<string, number>
}

// Use globalThis to persist across module reloads in development
const globalForParties = globalThis as unknown as {
  parties: Map<string, Party> | undefined
}

export const parties = globalForParties.parties ?? new Map<string, Party>()

if (process.env.NODE_ENV !== "production") {
  globalForParties.parties = parties
}

export function createParty(data: Omit<Party, "createdAt" | "players" | "status">) {
  const party: Party = {
    ...data,
    createdAt: Date.now(),
    players: [],
    status: "waiting",
  }
  parties.set(data.code, party)
  return party
}

export function getParty(code: string) {
  return parties.get(code)
}

export function updateParty(code: string, updates: Partial<Party>) {
  const party = parties.get(code)
  if (!party) return null

  const updatedParty = { ...party, ...updates }
  parties.set(code, updatedParty)
  return updatedParty
}

export function addPlayer(code: string, playerName: string) {
  const party = parties.get(code)
  if (!party) return null

  const player = { name: playerName, joinedAt: Date.now() }
  party.players.push(player)
  parties.set(code, party)
  return party
}

export function deleteParty(code: string) {
  return parties.delete(code)
}
