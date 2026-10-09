const BLOCK_OPEN_RE = /^<!--\s*wp:(?<name>[a-z0-9\-\/]+)(?<attrs>\s*\{.*\})?\s*-->$/;
const BLOCK_CLOSE_RE = /^<!--\s*\/wp:(?<name>[a-z0-9\-\/]+)\s*-->$/;

const TRANSLATABLE_SHORTCODE_ATTRS = {
  solidara_rating: ["question"],
};

const TRANSLATABLE_BLOCK_TYPES = new Set(["paragraph", "heading", "quote", "list", "list-item", "buttons", "button"]);

function extractShortcodeAttrs(raw) {
  const attrs = {};
  const re = /(\w+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function stripInnerMarkers(raw) {
  return raw
    .replace(/<!--\s*wp:[a-z0-9\-/]+(\s*\{.*\})?\s*-->/g, "")
    .replace(/<!--\s*\/wp:[a-z0-9\-/]+\s*-->/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l, idx, arr) => l.length > 0 || (idx > 0 && idx < arr.length - 1))
    .join("\n")
    .trim();
}

function parseBlockMarkup(name, attrsJson, lines) {
  const raw = lines.join("\n");
  const block = { type: name, raw };
  if (attrsJson) {
    try {
      block.attrs = JSON.parse(attrsJson);
    } catch {
      block.attrs = null;
    }
  }
  if (name === "heading") {
    block.level = block.attrs?.level ?? 2;
    block.content = stripOuterTags(raw);
    block.translatable = true;
  } else if (name === "paragraph" || name === "quote" || name === "list-item") {
    block.content = stripInnerMarkers(raw);
    block.translatable = true;
  } else if (name === "shortcode") {
    block.content = raw;
    block.translatable = false;
    const nameMatch = raw.match(/^\s*\[([a-z0-9_\-]+)/i);
    if (nameMatch) {
      const scName = nameMatch[1];
      block.shortcode = scName;
      const scAttrs = extractShortcodeAttrs(raw);
      const translatableKeys = TRANSLATABLE_SHORTCODE_ATTRS[scName] ?? [];
      const translatable = {};
      for (const key of translatableKeys) {
        if (key in scAttrs) translatable[key] = scAttrs[key];
      }
      if (Object.keys(translatable).length > 0) block.translatableAttrs = translatable;
    }
  } else {
    block.translatable = false;
  }
  return block;
}

function stripOuterTags(raw) {
  const match = raw.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/);
  return match ? match[1] : raw;
}

export function parseBlocks(input) {
  const text = typeof input === "string" ? input : String(input ?? "");
  const lines = text.split("\n").map((l) => l.trim());
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.length === 0) {
      i += 1;
      continue;
    }
    const open = line.match(BLOCK_OPEN_RE);
    if (open) {
      const name = open.groups.name;
      const closeRe = new RegExp(`^<!--\\s*/wp:${name.replace(/\//g, "\\/")}\\s*-->$`);
      let j = i + 1;
      const inner = [];
      while (j < lines.length && !closeRe.test(lines[j])) {
        inner.push(lines[j]);
        j += 1;
      }
      blocks.push(parseBlockMarkup(name, open.groups.attrs, inner));
      i = j + 1;
      continue;
    }
    if (!line.startsWith("<!--")) {
      blocks.push({ type: "freeform", content: line, translatable: false });
    }
    i += 1;
  }
  return blocks;
}

function blockText(block) {
  if (block.type === "shortcode") {
    const parts = Object.values(block.translatableAttrs ?? {});
    return parts.join(" ");
  }
  return block.translatable ? block.content ?? "" : "";
}

export function translatableText(blocks) {
  return blocks
    .filter((b) => b.translatable || (b.translatableAttrs && Object.keys(b.translatableAttrs).length > 0))
    .map(blockText)
    .join("\n");
}
