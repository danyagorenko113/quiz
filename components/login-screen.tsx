"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Disc3 } from "lucide-react"

export function LoginScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md p-10 bg-zinc-900/80 backdrop-blur border-zinc-800">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="w-24 h-24 rounded-full bg-[#20d760] flex items-center justify-center">
            <Disc3 className="w-12 h-12 text-black" strokeWidth={2.5} />
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-bold text-white">Spotify Playlist Quiz</h1>
            <p className="text-gray-400 text-lg">
              Test your music knowledge with friends. Play 10 second clips and guess the song!
            </p>
          </div>

          <Button
            onClick={() => signIn("spotify", { callbackUrl: "/host" })}
            size="lg"
            className="w-full bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold text-lg h-14"
          >
            Login with Spotify
          </Button>

          <p className="text-sm text-gray-500">Create a party or join with an invite code</p>
        </div>
      </Card>
    </div>
  )
}
