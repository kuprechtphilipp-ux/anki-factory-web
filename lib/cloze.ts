// Matches {{cN::answer}} where answer may contain single-depth LaTeX {braces}
// like r_{m} or \frac{a}{b}. Uses (?:[^{}]|\{[^{}]*\})+ to allow {…} pairs
// inside the answer without breaking on the closing }}.
const CLOZE_RE = /\{\{c\d+::((?:[^{}]|\{[^{}]*\})+)\}\}/g

export function maskCloze(text: string): string {
  return text.replace(CLOZE_RE, '[...]')
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
  // renders as literal asterisks, so we must not wrap it in `**`. Whether the
  // match sits inside such a span is determined by counting unescaped `$` in
  // the text *before* the match (odd count = inside an still-open math span)
  // — this also makes the function resilient to the generator wrapping the
  // answer in its own separate $...$ pair, rather than relying on a pre-split
  // by math delimiters which breaks whenever {{cN::...}} and $...$ overlap.
  return text.replace(CLOZE_RE, (_match, rawAnswer: string, offset: number, full: string) => {
    const before = full.slice(0, offset)
    const insideOuterMath = (before.match(/\$/g)?.length ?? 0) % 2 === 1
    const answer = stripSelfMathWrap(rawAnswer.trim())
    if (insideOuterMath) return answer
    return looksLikeMath(answer) ? `$${answer}$` : `**${answer}**`
  })
}
