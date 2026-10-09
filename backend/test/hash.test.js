import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { parseBlocks } from "../src/lib/gutenberg.js";
import { hashTranslatableBlocks } from "../src/lib/hash.js";

const SAMPLE = `<!-- wp:heading -->
<h2>Was ist KONTAKTOO?</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>KONTAKTOO ist ein <strong>Netzwerk</strong>.</p>
<!-- /wp:paragraph -->

<!-- wp:shortcode -->
[solidara_rating poll_id="startseite" question="Wie gefällt dir dieses Angebot?"]
<!-- /wp:shortcode -->

<!-- wp:html -->
<script>foo()</script>
<!-- /wp:html -->`;

test("hash changes only when translatable content changes", () => {
  const blocksA = parseBlocks(SAMPLE);
  const hashA = hashTranslatableBlocks(blocksA);

  const blocksB = parseBlocks(SAMPLE.replace("<script>foo()</script>", "<script>bar()</script>"));
  assert.equal(hashTranslatableBlocks(blocksB), hashA);

  const blocksC = parseBlocks(SAMPLE.replace("Was ist KONTAKTOO?", "What is KONTAKTOO?"));
  assert.notEqual(hashTranslatableBlocks(blocksC), hashA);
});

test("hash is stable sha256 hex", () => {
  const blocks = parseBlocks(SAMPLE);
  const hash = hashTranslatableBlocks(blocks);
  assert.match(hash, /^[0-9a-f]{64}$/);
});
