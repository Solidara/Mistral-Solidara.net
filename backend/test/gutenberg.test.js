import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlocks, translatableText } from "../src/lib/gutenberg.js";

const SAMPLE = `<!-- wp:html -->
<script src="https://www.digistore24-scripts.com/service/digistore.js"></script>
<script type="text/javascript">
digistorePromocode( { "product_id": 678366, "adjust_domain": true } );
</script>
<!-- /wp:html -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Was ist KONTAKTOO?</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>KONTAKTOO ist ein <strong>solidarisches Vertrauens- und Kontaktnetzwerk</strong>, in dem Menschen, Unternehmen, Organisationen und Projekte gezielt miteinander verbunden werden.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Vertrauen statt anonymer Reichweite</h3>
<!-- /wp:heading -->

<!-- wp:shortcode -->
[solidara_rating poll_id="startseite" question="Wie gefällt dir dieses Angebot?"]
<!-- /wp:shortcode -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>Weiter zum <strong><a href="/onboarding" data-type="page" data-id="846">Onboarding</a></strong></p>
<!-- /wp:paragraph --></blockquote>
<!-- /wp:quote -->`;

test("parses block types in order", () => {
  const blocks = parseBlocks(SAMPLE);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ["html", "heading", "paragraph", "heading", "shortcode", "quote"]
  );
});

test("html block is preserved raw and not translatable", () => {
  const blocks = parseBlocks(SAMPLE);
  const html = blocks[0];
  assert.equal(html.translatable, false);
  assert.ok(html.raw.includes("digistorePromocode"));
  assert.ok(html.raw.includes("product_id"));
});

test("heading parses level from attrs and strips tags", () => {
  const blocks = parseBlocks(SAMPLE);
  assert.equal(blocks[1].level, 2);
  assert.equal(blocks[1].content, "Was ist KONTAKTOO?");
  assert.equal(blocks[3].level, 3);
  assert.equal(blocks[3].content, "Vertrauen statt anonymer Reichweite");
});

test("paragraph keeps inline markup", () => {
  const blocks = parseBlocks(SAMPLE);
  assert.ok(blocks[2].content.includes("<strong>solidarisches"));
  assert.equal(blocks[2].translatable, true);
});

test("shortcode keeps raw, marks translatable attrs from registry", () => {
  const blocks = parseBlocks(SAMPLE);
  const sc = blocks[4];
  assert.equal(sc.shortcode, "solidara_rating");
  assert.equal(sc.translatable, false);
  assert.equal(sc.translatableAttrs.question, "Wie gefällt dir dieses Angebot?");
});

test("nested quote strips inner block markers", () => {
  const blocks = parseBlocks(SAMPLE);
  const quote = blocks[5];
  assert.equal(quote.translatable, true);
  assert.ok(quote.content.includes("Onboarding"));
  assert.ok(!quote.content.includes("wp:paragraph"));
});

test("translatableText collects only translatable content", () => {
  const blocks = parseBlocks(SAMPLE);
  const text = translatableText(blocks);
  assert.ok(text.includes("Was ist KONTAKTOO?"));
  assert.ok(text.includes("Wie gefällt dir dieses Angebot?"));
  assert.ok(!text.includes("digistorePromocode"));
});

test("empty input yields no blocks", () => {
  assert.deepEqual(parseBlocks(""), []);
});
