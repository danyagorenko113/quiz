import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HostDashboard } from "@/components/host-dashboard"

export default async function HostPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  return <HostDashboard session={session} />
}
