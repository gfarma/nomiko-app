/**
 * Vendor-agnostic AI chat completion.
 *
 * Configured entirely via env:
 *   AI_PROVIDER  — label stored in AIInteractionLog (e.g. "openrouter", "anthropic-compat")
 *   AI_BASE_URL  — OpenAI-compatible /chat/completions base, e.g. https://openrouter.ai/api/v1
 *   AI_API_KEY   — bearer token
 *   AI_MODEL     — model id
 *
 * When no key is configured (local demo), a deterministic mock formatter is
 * used so the human-in-the-loop flow can be exercised end-to-end with fake
 * data and zero external calls.
 */

export type AIResult = {
  output: string;
  model: string;
  provider: string;
  mocked: boolean;
};

export async function aiComplete(system: string, user: string): Promise<AIResult> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "unknown";
  const provider = process.env.AI_PROVIDER || "mock";

  if (!baseUrl || !apiKey) {
    return { output: mockStructure(user), model: "mock-formatter", provider: "mock", mocked: true };
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI provider error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const output = data.choices?.[0]?.message?.content ?? "";
  if (!output) throw new Error("AI provider returned empty response");
  return { output, model, provider, mocked: false };
}

/** Deterministic offline formatter used when no AI provider is configured. */
function mockStructure(input: string): string {
  const lines = input
    .split(/\n|·|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines.map((l) => `- ${l.charAt(0).toUpperCase()}${l.slice(1)}`).join("\n");
  return [
    "## Πρακτικό συνάντησης (δομημένο)",
    "",
    "### Σημεία συζήτησης",
    bullets || "- (κενές σημειώσεις)",
    "",
    "### Εκκρεμότητες",
    "- Να επιβεβαιωθούν οι επόμενες ενέργειες με τον εντολέα.",
    "",
    "_Δημιουργήθηκε από τον offline formatter (χωρίς AI πάροχο). Ενεργοποιήστε AI πάροχο μέσω env vars._",
  ].join("\n");
}
