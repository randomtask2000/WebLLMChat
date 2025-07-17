/**
 * Simple token counting utility for estimating tokens in text
 * Uses a rough approximation of 1 token ≈ 4 characters for English text
 */

export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;

  // Basic tokenization approximation
  // This is a rough estimate - real tokenizers are more complex
  const avgCharsPerToken = 4;
  return Math.ceil(text.length / avgCharsPerToken);
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}k tokens`;
  } else {
    return `${(tokens / 1000000).toFixed(1)}M tokens`;
  }
}
