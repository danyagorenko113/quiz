"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Music } from "lucide-react"

export function LoginScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(32,215,96,0.1),transparent_50%)]" />

      <Card className="w-full max-w-md p-10 bg-card/80 backdrop-blur-xl border-2 border-primary/20 relative z-10 shadow-[0_0_50px_rgba(32,215,96,0.3)]">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary blur-2xl opacity-50 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_30px_rgba(32,215,96,0.5)]">
              <Music className="w-12 h-12 text-black" strokeWidth={2.5} />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-bold text-balance bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Spotify Playlist Quiz
            </h1>
            <p className="text-muted-foreground text-lg text-pretty">
              Test your music knowledge with friends. Play 10 second clips and guess the song!
            </p>
          </div>

          <Button
            onClick={() => signIn("spotify", { callbackUrl: "/host" })}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-black font-semibold text-lg h-14 shadow-[0_0_20px_rgba(32,215,96,0.4)] hover:shadow-[0_0_30px_rgba(32,215,96,0.6)] transition-all"
          >
            Login with Spotify
          </Button>

          <p className="text-sm text-muted-foreground/70">Create a party or join with an invite code</p>
        </div>
      </Card>
    </div>
  )
}
