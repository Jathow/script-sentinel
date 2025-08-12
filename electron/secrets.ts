const SECRET_KEY_PATTERN = /(secret|token|password|passwd|pass|api[_-]?key|access[_-]?key|private|auth|bearer|client[_-]?secret)/i;

export function detectSecretValues(env: Record<string, string> | undefined): string[] {
  if (!env) return [];
  const values: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    if (SECRET_KEY_PATTERN.test(key)) {
      if (String(value).length >= 4) values.push(String(value));
    }
  }
  return values;
}

export function maskTextWithSecrets(text: string, secretValues: string[]): string {
  if (!text || secretValues.length === 0) return text;
  let masked = text;
  for (const raw of secretValues) {
    if (!raw) continue;
    // plain
    const plainRe = new RegExp(escapeRegex(raw), 'g');
    masked = masked.replace(plainRe, '****');
    // url-encoded
    const encoded = encodeURIComponent(raw);
    if (encoded && encoded !== raw) {
      const encRe = new RegExp(escapeRegex(encoded), 'g');
      masked = masked.replace(encRe, '****');
    }
  }
  return masked;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


