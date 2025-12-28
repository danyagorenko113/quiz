"use client"

import { useUser } from "@auth0/nextjs-auth0/client"
import { Card } from "@/components/ui/card"
import { UserRound } from "lucide-react"

export default function Profile() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 p-6 text-center">
        <p className="text-zinc-400">Loading profile...</p>
      </Card>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 p-6">
      <div className="flex flex-col items-center gap-4">
        {user.picture ? (
          <img
            src={user.picture || "/placeholder.svg"}
            alt={user.name || "User profile"}
            className="w-20 h-20 rounded-full"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#20d760] flex items-center justify-center">
            <UserRound className="w-10 h-10 text-black" />
          </div>
        )}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white">{user.name}</h3>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
      </div>
    </Card>
  )
}
