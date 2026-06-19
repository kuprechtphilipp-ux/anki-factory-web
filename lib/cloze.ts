// Finds the next {{cN::answer}} occurrence at or after `from`, where `answer`
// may contain arbitrarily nested LaTeX braces (e.g. \dfrac{\text{a}}{\text{b}}).
// A fixed-depth regex can't express unbounded brace nesting, so we scan
// manually and track brace depth instead of matching with a single pattern.
function findNextCloze(
  text: string,
  from: number
): { start: number; end: number; answer: string } | null {
  const openRe = /\{\{c\d+::/g
  openRe.lastIndex = from
  const open = openRe.exec(text)
  if (!open) return null

  const answerStart = open.index + open[0].length
  let i = answerStart
  let depth = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '{') {
      depth++
    } else if (ch === '}') {
      if (depth === 0 && text[i + 1] === '}') {
        return { start: open.index, end: i + 2, answer: text.slice(answerStart, i) }
      }
      if (depth > 0) depth--
    }
    i++
  }
  return null // unterminated marker — leave as-is
}

function replaceClozes(
  text: string,
  transform: (answer: string, matchStart: number, fullText: string) => string
): string {
  let result = ''
  let cursor = 0
  while (cursor <= text.length) {
    const match = findNextCloze(text, cursor)
    if (!match) {
      result += text.slice(cursor)
      break
    }
    result += text.slice(cursor, match.start)
    result += transform(match.answer, match.start, text)
    cursor = match.end
  }
  return result
}

export function maskCloze(text: string): string {
  return replaceClozes(text, () => '[...]')
}

function looksLikeMath(s: string): boolean {
  return /[_^\\]/.test(s)
}

// Strips a self-contained $...$/$$...$$ wrapper the generator sometimes puts
// around the cloze answer itself, so we control the delimiters ourselves
// below instead of risking adjacent/doubled $ when re-wrapping.
function stripSelfMathWrap(s: string): string {
  return s.replace(/^\$\$([\s\S]*)\$\$$/, '$1').replace(/^\$([^$]*)\$$/, '$1')
}

export function unmaskCloze(text: string): string {
  // **answer** inside an outer $...$ span is passed verbatim to KaTeX and
  // renders as literal asterisks, so we must not wrap it in `**`. Whether a
  // match sits inside such a span is determined by counting unescaped `$` in
  // the text *before* the match (odd count = inside a still-open math span).
  return replaceClozes(text, (rawAnswer, matchStart, fullText) => {
    const before = fullText.slice(0, matchStart)
    const insideOuterMath = (before.match(/\$/g)?.length ?? 0) % 2 === 1
    const answer = stripSelfMathWrap(rawAnswer.trim())
    if (insideOuterMath) return answer
    return looksLikeMath(answer) ? `$${answer}$` : `**${answer}**`
  })
}
