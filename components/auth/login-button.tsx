"use client"

import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

export default function LoginButton() {
  return (
    <Button
      onClick={() => (window.location.href = "/api/auth/login")}
      className="bg-[#20d760] hover:bg-[#1ed760] text-black font-semibold"
    >
      <LogIn className="mr-2 h-5 w-5" />
      Log In
    </Button>
  )
}
