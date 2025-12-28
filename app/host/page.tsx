import { redirect } from "next/navigation"
import { auth0 } from "@/lib/auth0"
import { HostDashboard } from "@/components/host-dashboard"

export default async function HostPage() {
  const session = await auth0.getSession()

  if (!session) {
    redirect("/auth/login?returnTo=/host")
  }

  // Get access token for API calls (for Spotify integration)
  let accessToken: string | null = null
  try {
    const token = await auth0.getAccessToken()
    accessToken = token?.accessToken || null
  } catch (error) {
    console.error("Error getting access token:", error)
  }

  // Create a compatible session object for the component
  // The component expects next-auth Session type, but we'll provide compatible structure
  const compatibleSession = {
    user: session.user,
    accessToken,
    expires: session.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  return <HostDashboard session={compatibleSession as any} />
}
