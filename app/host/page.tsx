import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HostDashboard } from "@/components/host-dashboard"

export default async function HostPage() {
  const session = await auth()

  if (!session) {
    redirect("/")
  }

  return <HostDashboard session={session} />
}
