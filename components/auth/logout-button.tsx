"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default function LogoutButton() {
  return (
    <Button
      onClick={() => (window.location.href = "/auth/logout")}
      variant="outline"
      className="border-[#fc4839] text-[#fc4839] hover:bg-[#fc4839] hover:text-white"
    >
      <LogOut className="mr-2 h-5 w-5" />
      Log Out
    </Button>
  )
}
