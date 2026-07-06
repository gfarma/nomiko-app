/**
 * Feature flags. AI features are OFF by default and must only be enabled in
 * demo/test environments with fake data until a DPA-backed AI provider is
 * locked in (GDPR Art. 28 + attorney-client privilege, Ν. 4194/2013).
 */
export const flags = {
  aiFeatures: process.env.ENABLE_AI_FEATURES === "true",
};
