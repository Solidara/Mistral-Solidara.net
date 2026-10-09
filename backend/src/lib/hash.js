import crypto from "node:crypto";

export function hashTranslatableBlocks(blocks) {
  const text = blocks
    .filter((b) => b.translatable || (b.translatableAttrs && Object.keys(b.translatableAttrs).length > 0))
    .map((b) => (b.translatableAttrs ? JSON.stringify(b.translatableAttrs) : b.content))
    .join("\n");
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
