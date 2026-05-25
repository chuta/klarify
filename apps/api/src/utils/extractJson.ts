// =============================================================================
// Shared JSON extraction for structured Claude outputs.
// =============================================================================

/** Strip code fences and locate the first JSON object in Claude's reply. */
export function extractJsonObject(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) text = fenced[1].trim();

  if (!text.startsWith('{')) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }
  return JSON.parse(text);
}
