import { QuizInterface } from "@/components/quiz-interface"

export default function QuizPage({ params }: { params: { code: string } }) {
  return <QuizInterface partyCode={params.code} />
}
