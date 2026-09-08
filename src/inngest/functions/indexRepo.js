import { inngest } from "../client.js";
import { fetchRepoFiles } from "../../services/github.js";
import { chunkFiles } from "../../services/chunker.js";
import { saveChunks, setRepoMeta } from "../../services/vectorStore.js";
import { updateJob } from "../../services/jobStore.js";

export const indexRepo = inngest.createFunction(
  { id: "index-repo", triggers: [{ event: "repo/index.requested" }] },
  async ({ event, step }) => {
    const { jobId, githubToken, owner, repo, repoKey, commitSha } = event.data;

    try {
      const files = await step.run("fetch-github-files", () =>
        fetchRepoFiles(githubToken, owner, repo, commitSha)
      );

      const documents = await step.run("chunk-files", () => chunkFiles(files, repoKey));

      const saveResult = await step.run("save-to-pinecone", () => saveChunks(repoKey, documents));

      const result = {
        repo: repoKey,
        fileCount: files.length,
        chunkCount: documents.length,
        saved: saveResult.saved,
        commitSha,
        indexedAt: Date.now(),
      };

      await step.run("record-repo-meta", () => setRepoMeta(repoKey, result));

      if (jobId) await updateJob(jobId, { status: "completed", result });
      return result;
    } catch (error) {
      if (jobId) await updateJob(jobId, { status: "failed", error: error.message });
      throw error;
    }
  }
);