import { Router } from "express";
import { randomUUID } from "node:crypto";
import { inngest } from "../inngest/client.js";
import { parseRepo, getLatestCommitSha } from "../services/github.js";
import { getRepoMeta } from "../services/vectorStore.js";
import { createJob, getJob } from "../services/jobStore.js";

const router = Router();

router.post("/", async (req, res) => {
  const githubToken = req.body.githubToken || process.env.GITHUB_TOKEN;
  const { owner, repo, repoKey } = parseRepo(req.body.repo);
  const force = req.body.force === true;

  try {
    const latestSha = await getLatestCommitSha(githubToken, owner, repo);

    if (!force) {
      const meta = await getRepoMeta(repoKey);
      if (meta?.commitSha === latestSha) {
        const jobId = randomUUID();
        await createJob(jobId, { type: "index", repo: repoKey, status: "completed", result: meta });
        return res.json({ jobId, repo: repoKey, status: "completed", cached: true, result: meta });
      }
    }

    const jobId = randomUUID();
    await createJob(jobId, { type: "index", repo: repoKey });

    await inngest.send({
      name: "repo/index.requested",
      data: { jobId, githubToken, owner, repo, repoKey, commitSha: latestSha },
    });

    res.json({ jobId, repo: repoKey, status: "pending" });
  } catch (err) {
    res.status(502).json({ error: `Failed to check repo status: ${err.message}` });
  }
});

router.get("/:jobId", async (req, res) => {
  const job = await getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json(job);
});

export default router;