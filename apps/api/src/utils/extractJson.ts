// =============================================================================
// Shared JSON extraction for structured Claude outputs.
// =============================================================================

function stripJsonWrapper(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) text = fenced[1].trim();

  if (!text.startsWith('{')) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }
  return text;
}

/** Close an object/array stack left open by truncated model output. */
function repairTruncatedJson(text: string): string {
  const stack: Array<'{' | '['> = [];
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{' || char === '[') stack.push(char);
    if (char === '}' && stack[stack.length - 1] === '{') stack.pop();
    if (char === ']' && stack[stack.length - 1] === '[') stack.pop();
  }

  let repaired = text.trimEnd();
  if (inString) repaired += '"';
  while (stack.length > 0) {
    const open = stack.pop();
    repaired += open === '{' ? '}' : ']';
  }
  return repaired;
}

/** Strip code fences and locate the first JSON object in Claude's reply. */
export function extractJsonObject(raw: string): unknown {
  const text = stripJsonWrapper(raw);
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(repairTruncatedJson(text));
  }
}
