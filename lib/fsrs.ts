import { FSRS, generatorParameters, createEmptyCard, Rating } from 'ts-fsrs'
import type { Karte } from './types'

export { Rating }

const params = generatorParameters()
export const fsrs = new FSRS(params)

export function karteToFsrsCard(karte: Karte) {
  return {
    due: new Date(karte.fsrs_due),
    stability: karte.fsrs_stability,
    difficulty: karte.fsrs_difficulty,
    elapsed_days: karte.fsrs_elapsed_days,
    scheduled_days: karte.fsrs_scheduled_days,
    reps: karte.fsrs_reps,
    lapses: karte.fsrs_lapses,
    state: karte.fsrs_state,
    last_review: karte.fsrs_last_review ? new Date(karte.fsrs_last_review) : undefined,
    learning_steps: 0,
  }
}

export function newFsrsCard() {
  return createEmptyCard()
}
