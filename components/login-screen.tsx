"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Music } from "lucide-react"

export function LoginScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
      <Card className="w-full max-w-md p-8 bg-background/95 backdrop-blur">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center">
            <Music className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-balance">Spotify Playlist Quiz</h1>
            <p className="text-muted-foreground text-pretty">
              Test your music knowledge with friends. Play 10 second clips and guess the song!
            </p>
          </div>

          <Button
            onClick={() => signIn("spotify", { callbackUrl: "/host" })}
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Login with Spotify
          </Button>

          <p className="text-sm text-muted-foreground">Create a party or join with an invite code</p>
        </div>
      </Card>
    </div>
  )
}
