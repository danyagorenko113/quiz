import { redirect } from "next/navigation"
import { getSession } from "@auth0/nextjs-auth0"
import { HostDashboard } from "@/components/host-dashboard"
import { cookies } from "next/headers"

export default async function HostPage() {
  const cookieStore = await cookies()
  const session = await getSession(cookieStore)

  if (!session) {
    redirect("/api/auth/login?returnTo=/host")
  }

  return <HostDashboard session={{ user: session.user }} />
}
