import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth0"
import { HostDashboard } from "@/components/host-dashboard"

export default async function HostPage() {
  const session = await getSession()

  if (!session) {
    redirect("/api/auth/login?returnTo=/host")
  }

  return <HostDashboard session={session} />
}
