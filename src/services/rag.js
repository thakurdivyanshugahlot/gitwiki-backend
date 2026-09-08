import { ChatOpenAI } from "@langchain/openai";
import { search } from "./vectorStore.js";

const SYSTEM_PROMPT = `You are Git Wiki, an assistant that answers questions about a specific GitHub repository using only the indexed source code provided as context.

Rules:
- Answer using the provided repo context only. If the context doesn't contain enough information to answer confidently, say so plainly instead of guessing.
- Format your entire response in Markdown.
- Use numbered or bulleted lists for any multi-step explanation or set of options.
- Use fenced code blocks with a language tag for any code, commands, or config snippets.
- Reference file paths in backticks (e.g. \`src/utils/auth.js\`) when pointing to a specific file.
- Keep answers focused — skip generic preamble, get straight to the technical explanation.
- Never invent file names, functions, or behavior that isn't shown in the context.`;

function toText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part.text ?? ""))
      .join("");
  }
  return String(content ?? "");
}

export async function askQuestion(repo, question, { topK = 5, onProgress } = {}) {
  const docs = await search(repo, question, topK);

  if (!docs.length) {
    return {
      answer: "No indexed content was found for this repo. Index it first, then try again.",
      sources: [],
    };
  }

  const context = docs
    .map((doc) => `File: ${doc.metadata.path}\n${doc.pageContent}`)
    .join("\n\n");

  const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

  const stream = await llm.stream([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Repository: ${repo}\n\nContext:\n${context}\n\nQuestion: ${question}` },
  ]);

  let answer = "";
  let lastFlush = Date.now();

  for await (const chunk of stream) {
    answer += toText(chunk.content);
    if (onProgress && Date.now() - lastFlush > 400) {
      await onProgress(answer);
      lastFlush = Date.now();
    }
  }

  return {
    answer,
    sources: [...new Set(docs.map((doc) => doc.metadata.path).filter(Boolean))],
  };
}