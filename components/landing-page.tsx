"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Disc3, Zap, Users, Trophy, ArrowRight, Music2 } from "lucide-react"
import Link from "next/link"
import type { Session } from "next-auth"

interface LandingPageProps {
  session: Session | null
}

export function LandingPage({ session }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#20d760]/10 via-transparent to-[#01fffe]/5" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-[#20d760] mb-4">
              <Disc3 className="w-16 h-16 text-black" strokeWidth={2.5} />
            </div>

            <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
              Spotify Playlist
              <span className="block text-[#20d760]">Quiz Party</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Turn your favorite Spotify playlists into epic multiplayer quizzes. Play, compete, and discover music with
              friends in real-time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              {session ? (
                <Link href="/host">
                  <Button
                    size="lg"
                    className="bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold text-lg h-16 px-10"
                  >
                    Start Hosting
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={() => signIn("spotify", { callbackUrl: "/host" })}
                  size="lg"
                  className="bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold text-lg h-16 px-10"
                >
                  Login with Spotify
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}

              <Link href="/join">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-[#20d760] text-[#20d760] hover:bg-[#20d760]/10 font-semibold text-lg h-16 px-10 bg-transparent"
                >
                  Join a Party
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-gray-400">Three simple steps to start your music quiz party</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-8 bg-zinc-900/50 border-zinc-800 hover:border-[#20d760]/50 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-[#20d760]/10 flex items-center justify-center mb-6">
              <Music2 className="w-8 h-8 text-[#20d760]" />
            </div>
            <h3 className="text-2xl font-bold mb-4">1. Choose Your Playlist</h3>
            <p className="text-gray-400 leading-relaxed">
              Connect your Spotify account and select any playlist. We'll pick tracks with preview URLs for the perfect
              quiz experience.
            </p>
          </Card>

          <Card className="p-8 bg-zinc-900/50 border-zinc-800 hover:border-[#01fffe]/50 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-[#01fffe]/10 flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-[#01fffe]" />
            </div>
            <h3 className="text-2xl font-bold mb-4">2. Invite Your Friends</h3>
            <p className="text-gray-400 leading-relaxed">
              Share your unique party code with friends. They can join instantly without needing Spotify Premium or even
              an account.
            </p>
          </Card>

          <Card className="p-8 bg-zinc-900/50 border-zinc-800 hover:border-[#fc4839]/50 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-[#fc4839]/10 flex items-center justify-center mb-6">
              <Trophy className="w-8 h-8 text-[#fc4839]" />
            </div>
            <h3 className="text-2xl font-bold mb-4">3. Play & Compete</h3>
            <p className="text-gray-400 leading-relaxed">
              Play 10-second clips, guess the artist from multiple choices, and watch the leaderboard update in
              real-time. May the best music fan win!
            </p>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4">Why You'll Love It</h2>
          <p className="text-xl text-gray-400">Built for music lovers, powered by AI</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-zinc-900/30 border-zinc-800">
            <Zap className="w-10 h-10 text-[#20d760] mb-4" />
            <h4 className="text-xl font-semibold mb-2">Real-time Sync</h4>
            <p className="text-gray-400 text-sm">
              Everyone plays together with instant updates and synchronized gameplay.
            </p>
          </Card>

          <Card className="p-6 bg-zinc-900/30 border-zinc-800">
            <Music2 className="w-10 h-10 text-[#01fffe] mb-4" />
            <h4 className="text-xl font-semibold mb-2">Any Playlist</h4>
            <p className="text-gray-400 text-sm">
              Use your own playlists or discover new music from friends' collections.
            </p>
          </Card>

          <Card className="p-6 bg-zinc-900/30 border-zinc-800">
            <Users className="w-10 h-10 text-[#f89dcf] mb-4" />
            <h4 className="text-xl font-semibold mb-2">No Barriers</h4>
            <p className="text-gray-400 text-sm">Players don't need Spotify accounts to join and play along.</p>
          </Card>

          <Card className="p-6 bg-zinc-900/30 border-zinc-800">
            <Trophy className="w-10 h-10 text-[#fc4839] mb-4" />
            <h4 className="text-xl font-semibold mb-2">AI-Powered</h4>
            <p className="text-gray-400 text-sm">Smart multiple-choice questions with AI-generated similar artists.</p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Card className="p-12 bg-gradient-to-br from-[#20d760]/10 to-[#01fffe]/5 border-[#20d760]/20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Test Your Music IQ?</h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Start your first quiz party in seconds. No setup required.
          </p>

          {session ? (
            <Link href="/host">
              <Button size="lg" className="bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold text-lg h-16 px-12">
                Create Your Party
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <Button
              onClick={() => signIn("spotify", { callbackUrl: "/host" })}
              size="lg"
              className="bg-[#20d760] hover:bg-[#1ab34f] text-black font-semibold text-lg h-16 px-12"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          )}
        </Card>
      </div>

      {/* Footer */}
      
    </div>
  )
}
