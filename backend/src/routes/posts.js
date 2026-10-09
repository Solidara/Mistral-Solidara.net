import { Router } from "express";
import { Post, PostTranslation } from "../models/post.js";
import { parseBlocks } from "../lib/gutenberg.js";
import { hashTranslatableBlocks } from "../lib/hash.js";
import { isSupportedLang, translateBlocks } from "../lib/translate.js";

export const postsRouter = Router();

postsRouter.post("/posts", async (req, res, next) => {
  try {
    const { source, sourceRef, slug, originalLang, author, status, rawContent } = req.body ?? {};
    if (typeof slug !== "string" || slug.length === 0) {
      return res.status(400).json({ error: "slug is required" });
    }
    if (typeof rawContent !== "string") {
      return res.status(400).json({ error: "rawContent is required" });
    }
    const blocks = parseBlocks(rawContent);
    const contentHash = hashTranslatableBlocks(blocks);
    const filter = sourceRef?.wpPostId
      ? { "sourceRef.wpPostId": sourceRef.wpPostId }
      : { slug };
    const existing = await Post.findOne(filter).lean();
    if (existing?.contentHash !== contentHash) {
      await PostTranslation.updateMany({ postId: existing?._id }, { $set: { status: "stale" } });
    }
    const doc = {
      source: source ?? "wordpress",
      sourceRef,
      slug,
      originalLang: originalLang ?? "de",
      author,
      status: status ?? "published",
      blocks,
      contentHash,
    };
    const post = await Post.findOneAndUpdate(filter, doc, { new: true, upsert: true });
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

postsRouter.get("/posts/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const lang = (req.query.lang ?? "de").toLowerCase();
    const post = await Post.findOne({ slug }).lean();
    if (!post) {
      return res.status(404).json({ error: "post not found" });
    }
    if (lang === post.originalLang || !isSupportedLang(lang)) {
      return res.json({ post, lang: post.originalLang, translation: null });
    }
    let translation = await PostTranslation.findOne({ postId: post._id, lang }).lean();
    if (translation && translation.sourceContentHash === post.contentHash && translation.status !== "stale") {
      return res.json({ post, lang, translation });
    }
    let translatedBlocks;
    try {
      translatedBlocks = await translateBlocks(post.blocks, post.originalLang, lang);
    } catch (err) {
      if (err.expose) {
        return res.status(err.statusCode ?? 503).json({ post, lang, translation: null, notice: err.message });
      }
      throw err;
    }
    translation = await PostTranslation.findOneAndUpdate(
      { postId: post._id, lang },
      {
        $set: {
          status: "machine-generated",
          sourceContentHash: post.contentHash,
          blocks: translatedBlocks,
          generator: process.env.TRANSLATION_GENERATOR ?? "mistral",
        },
      },
      { new: true, upsert: true }
    ).lean();
    res.json({ post, lang, translation });
  } catch (err) {
    next(err);
  }
});
