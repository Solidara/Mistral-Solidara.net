const SUPPORTED_LANGS = new Set(["de", "en", "es", "fr"]);

export function isSupportedLang(lang) {
  return SUPPORTED_LANGS.has(lang);
}

export async function translateBlocks(blocks, sourceLang, targetLang) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    const err = new Error("translation unavailable: MISTRAL_API_KEY not configured");
    err.statusCode = 503;
    err.expose = true;
    throw err;
  }
  throw new Error("translateBlocks: not implemented yet (will call Mistral API)");
}
