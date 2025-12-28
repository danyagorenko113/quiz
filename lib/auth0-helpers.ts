import { getSession } from "@auth0/nextjs-auth0"
import { kv } from "@vercel/kv"

export interface SpotifyCredentials {
  clientId: string
  clientSecret: string
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function saveSpotifyCredentials(userId: string, credentials: SpotifyCredentials) {
  await kv.set(`spotify:${userId}`, credentials)
}

export async function getSpotifyCredentials(userId: string): Promise<SpotifyCredentials | null> {
  return await kv.get(`spotify:${userId}`)
}
