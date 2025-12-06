import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginScreen } from "@/components/login-screen"

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect("/host")
  }

  return <LoginScreen />
}
