import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginScreen } from "@/components/login-screen"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/host")
  }

  return <LoginScreen />
}
