import mongoose from "mongoose";

const blockSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    raw: { type: String },
    attrs: { type: mongoose.Schema.Types.Mixed },
    level: { type: Number },
    content: { type: String },
    shortcode: { type: String },
    translatable: { type: Boolean, default: false },
    translatableAttrs: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const sourceRefSchema = new mongoose.Schema(
  {
    wpPostId: { type: Number },
    blog: { type: String },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, enum: ["wordpress", "flutter", "api-direct"] },
    sourceRef: { type: sourceRefSchema },
    slug: { type: String, required: true, trim: true },
    originalLang: { type: String, required: true, default: "de" },
    author: { type: String },
    status: { type: String, required: true, default: "published" },
    schemaVersion: { type: Number, default: 1 },
    blocks: { type: [blockSchema], default: [] },
    contentHash: { type: String },
  },
  { timestamps: true }
);

postSchema.index({ slug: 1 }, { unique: true });
postSchema.index({ "sourceRef.wpPostId": 1 }, { unique: true, sparse: true });

export const Post = mongoose.model("Post", postSchema);

const translationSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    lang: { type: String, required: true },
    status: { type: String, enum: ["machine-generated", "reviewed", "stale"], default: "machine-generated" },
    sourceContentHash: { type: String },
    blocks: { type: [blockSchema], default: [] },
    generator: { type: String },
  },
  { timestamps: true }
);

translationSchema.index({ postId: 1, lang: 1 }, { unique: true });

export const PostTranslation = mongoose.model("PostTranslation", translationSchema);
