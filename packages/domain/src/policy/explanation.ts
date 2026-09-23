/**
 * Structured policy explanations (AUCTRA.md Section 45).
 *
 * Explanations are generated from policy metadata, never from an LLM or free
 * text. Each explanation is an INPUT -> EFFECT -> OUTPUT triple.
 */
export interface PolicyExplanation {
  input: string
  effect: string
  output: string
}

export function explain(input: string, effect: string, output: string): PolicyExplanation {
  return { input, effect, output }
}
