import { createHash } from "node:crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";

const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const UPSERT_BATCH_SIZE = 100;
const DEFAULT_TOP_K = 5;
const META_RECORD_ID = "__repo_meta__";
const EMBEDDING_DIM = 1536; // text-embedding-3-small — update if you change embedding models

function repoToNamespace(repo) {
  return repo.replace("/", "-");
}

function getIndex(namespace) {
  const indexName = process.env.PINECONE_INDEX || "git-wiki";
  return pc.index({ name: indexName }).namespace(namespace);
}

function normalizeDocuments(documents) {
  return documents
    .map((doc) => ({
      pageContent: typeof doc.pageContent === "string" ? doc.pageContent : "",
      metadata: doc.metadata ?? {},
    }))
    .filter((doc) => doc.pageContent.trim().length > 0);
}

function buildRecordId(repo, metadata, content) {
  return createHash("sha256")
    .update(`${repo}:${metadata.path ?? ""}:${content}`)
    .digest("hex");
}

function toSearchDocument(match) {
  const metadata = match.metadata ?? {};

  return {
    pageContent: metadata.text ?? "",
    metadata: {
      path: metadata.path,
      repo: metadata.repo,
    },
    score: match.score,
  };
}

export async function saveChunks(repo, documents) {
  const chunks = normalizeDocuments(documents);

  if (!chunks.length) {
    return { saved: false, chunkCount: 0 };
  }

  const namespace = repoToNamespace(repo);
  const index = getIndex(namespace);
  const texts = chunks.map((doc) => doc.pageContent);
  const vectors = await embeddings.embedDocuments(texts);

  const records = chunks.map((doc, i) => ({
    id: buildRecordId(repo, doc.metadata, doc.pageContent),
    values: vectors[i],
    metadata: {
      text: doc.pageContent,
      path: doc.metadata.path,
      repo: doc.metadata.repo ?? repo,
    },
  }));

  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    await index.upsert({
      records: records.slice(i, i + UPSERT_BATCH_SIZE),
    });
  }

  return { saved: true, chunkCount: chunks.length };
}

export async function search(repo, question, topK = DEFAULT_TOP_K) {
  const namespace = repoToNamespace(repo);
  const index = getIndex(namespace);
  const vector = await embeddings.embedQuery(question);

  const response = await index.query({
    vector,
    topK,
    includeMetadata: true,
  });

  return (response.matches ?? [])
    .map(toSearchDocument)
    .filter((doc) => doc.pageContent.trim().length > 0);
}

// --- Repo-level metadata (last indexed commit, counts, etc.) ---
// Stored as a single sentinel record per namespace so it survives backend
// restarts. Its all-zero vector and missing `text` metadata field mean it
// naturally falls out of search()'s existing filter and never reaches
// askQuestion()'s context or sources.

export async function getRepoMeta(repo) {
  const namespace = repoToNamespace(repo);
  const index = getIndex(namespace);

  const result = await index.fetch({ ids: [META_RECORD_ID] });
  const record = result.records?.[META_RECORD_ID];
  return record ? record.metadata : null;
}
export async function setRepoMeta(repo, meta) {
  const namespace = repoToNamespace(repo);
  const index = getIndex(namespace);

  // Pinecone rejects all-zero dense vectors, so use a tiny non-zero filler
  // instead — this vector carries no real semantic content and is never
  // meant to be found via similarity search, only fetched by exact ID.
  const fillerVector = new Array(EMBEDDING_DIM).fill(0);
  fillerVector[0] = 1e-6;

  await index.upsert({
    records: [
      {
        id: META_RECORD_ID,
        values: fillerVector,
        metadata: meta,
      },
    ],
  });
}