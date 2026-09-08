import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import { inngest } from "../inngest/client.js";
import { parseRepo } from "../services/github.js";
import { createJob, getJob } from "../services/jobStore.js";
import { saveMessage, getMessages, getUserRepos, deleteMessagesForRepo } from "../services/chatHistory.js";

const router = Router();

router.post("/", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { repo, question } = req.body ?? {};
  if (!repo || !question) {
    return res.status(400).json({ error: "repo and question are required" });
  }

  const { repoKey } = parseRepo(repo);
  const jobId = randomUUID();

  await saveMessage({ userId, repo: repoKey, role: "user", content: question });
  await createJob(jobId, { type: "chat", repo: repoKey, userId, question });

  await inngest.send({
    name: "chat/question.requested",
    data: { jobId, repo: repoKey, question, userId },
  });

  res.status(202).json({ jobId, status: "pending" });
});

router.get("/activity", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const repos = await getUserRepos(userId);
  res.json(repos);
});

router.get("/history", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { repo } = req.query;
  if (!repo) return res.status(400).json({ error: "repo is required" });

  const { repoKey } = parseRepo(repo);
  const messages = await getMessages(userId, repoKey);
  res.json(messages);
});

router.delete("/history", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { repo } = req.query;
  if (!repo) return res.status(400).json({ error: "repo is required" });

  const { repoKey } = parseRepo(repo);
  await deleteMessagesForRepo(userId, repoKey);
  res.json({ cleared: true });
});

router.get("/:jobId", async (req, res) => {
  const job = await getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json(job);
});

export default router;