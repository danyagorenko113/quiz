"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Disc3, MoveRight } from "lucide-react"
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
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md p-8 bg-zinc-900/80 backdrop-blur border-zinc-800">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#20d760] flex items-center justify-center">
            <Disc3 className="w-10 h-10 text-black" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">Join Quiz Party</h1>
            <p className="text-gray-400">Enter the Party Code to start guessing</p>
          </div>

          <div className="w-full space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Your Name</label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value)
                  setError("")
                }}
                className="text-lg bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-[#20d760]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Party Code</label>
              <Input
                type="text"
                placeholder="ABC123"
                value={partyCode}
                onChange={(e) => {
                  setPartyCode(e.target.value.toUpperCase())
                  setError("")
                }}
                className="text-lg uppercase bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-[#20d760]"
                maxLength={6}
              />
            </div>

            {error && <p className="text-sm text-[#fc4839]">{error}</p>}

            <Button
              onClick={handleJoin}
              size="lg"
              className="w-full bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold"
            >
              Join Party
              <MoveRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <a href="/" className="text-sm text-gray-500 hover:text-[#20d760] transition-colors">
            Back to home
          </a>
        </div>
      </Card>
    </div>
  )
}
