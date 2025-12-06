"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Music, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function JoinPage() {
  const [partyCode, setPartyCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleJoin = async () => {
    if (!partyCode.trim()) {
      setError("Please enter a party code")
      return
    }
    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }

    const code = partyCode.toUpperCase()

    try {
      const response = await fetch("/api/party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          playerName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to join party")
        return
      }

      // Store player info locally
      localStorage.setItem("playerName", playerName)
      localStorage.setItem("currentParty", code)

      // Redirect to quiz (waiting room)
      router.push(`/quiz/${code}`)
    } catch (error) {
      console.error("[v0] Error joining party:", error)
      setError("Failed to join party. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
      <Card className="w-full max-w-md p-8 bg-background/95 backdrop-blur">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center">
            <Music className="w-10 h-10 text-white" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Join Quiz Party</h1>
            <p className="text-muted-foreground">Enter the party code to start guessing</p>
          </div>

          <div className="w-full space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value)
                  setError("")
                }}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Party Code</label>
              <Input
                type="text"
                placeholder="ABC123"
                value={partyCode}
                onChange={(e) => {
                  setPartyCode(e.target.value.toUpperCase())
                  setError("")
                }}
                className="text-lg uppercase"
                maxLength={6}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleJoin} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Join Party
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <a href="/" className="text-sm text-muted-foreground hover:underline">
            Back to home
          </a>
        </div>
      </Card>
    </div>
  )
}
