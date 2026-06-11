export type QuizModus = 'quick' | 'pruefung'

// Grobe Schätzung: Sockelkosten (System-Prompt + Distractor-Pool) + variable Kosten pro Frage (Output)
const QUIZ_COST_MODEL: Record<QuizModus, { baseUsd: number; perQuestionUsd: number }> = {
  quick: { baseUsd: 0.002, perQuestionUsd: 0.0005 }, // Haiku, kleiner Pool ohne Kontext
  pruefung: { baseUsd: 0.0234, perQuestionUsd: 0.0021 }, // Sonnet, Pool bis 80 Karten mit Kontext
}

export function estimateQuizCredits(anzahl: number, modus: QuizModus): number {
  const { baseUsd, perQuestionUsd } = QUIZ_COST_MODEL[modus]
  const costUsd = baseUsd + perQuestionUsd * anzahl
  return Math.max(1, Math.ceil(costUsd * 100))
}

// Grobe Schätzung: ein Haiku-Call pro Karte (Bewertung der Antwort), kleiner Prompt + kurzes Feedback
const SCHRIFTLICH_PER_KARTE_USD = 0.0008

export function estimateSchriftlichCredits(anzahl: number): number {
  const costUsd = SCHRIFTLICH_PER_KARTE_USD * anzahl
  return Math.max(1, Math.ceil(costUsd * 100))
}
