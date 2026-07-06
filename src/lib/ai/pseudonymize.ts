/**
 * Best-effort pseudonymization before text leaves the app towards an AI
 * provider. This is NOT bulletproof NLP anonymization — it strips the
 * structured identifiers we know about (emails, phones, ΑΦΜ/ΑΔΤ-like numbers)
 * and any names the caller explicitly passes (e.g. client/party names from
 * the case record). Real deployment additionally requires a DPA-backed,
 * zero-retention provider.
 */
export function pseudonymize(text: string, knownNames: string[] = []): { text: string; replacements: number } {
  let out = text;
  let replacements = 0;

  for (const [i, name] of knownNames.filter((n) => n && n.trim().length > 2).entries()) {
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    out = out.replace(re, () => {
      replacements++;
      return `[ΠΡΟΣΩΠΟ_${i + 1}]`;
    });
  }

  // emails
  out = out.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, () => {
    replacements++;
    return "[EMAIL]";
  });
  // Greek phone numbers (10 digits, optionally +30 / spaces)
  out = out.replace(/(\+30[\s-]?)?(69|2\d)\d{1}[\s-]?\d{3}[\s-]?\d{4}/g, () => {
    replacements++;
    return "[ΤΗΛΕΦΩΝΟ]";
  });
  // ΑΦΜ (9 digits) / ΑΜΚΑ (11 digits) standalone
  out = out.replace(/\b\d{9}(\d{2})?\b/g, () => {
    replacements++;
    return "[ΑΡΙΘΜΟΣ_ΜΗΤΡΩΟΥ]";
  });

  return { text: out, replacements };
}
