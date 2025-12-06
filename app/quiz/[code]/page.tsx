import { QuizInterface } from "@/components/quiz-interface"

export default async function QuizPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <QuizInterface partyCode={code} />
}
