// Zentrale Zuordnung: echte Anthropic-Modell-IDs -> Cramo-Markennamen für die UI.
// Bei einem Modellwechsel hier nur die ID anpassen, der Anzeigename bleibt stabil.
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'claude-sonnet-4-6': 'Cramo Forge',
  'claude-haiku-4-5-20251001': 'Cramo Spark',
}

export function getDisplayModelName(model: string): string {
  return MODEL_DISPLAY_NAMES[model] ?? 'Cramo AI'
}
