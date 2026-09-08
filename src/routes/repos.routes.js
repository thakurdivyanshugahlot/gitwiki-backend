import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import { listUserRepos } from "../services/github.js";

const router = Router();

router.get("/", requireUser, async (_req, res) => {
  try {
    const repos = await listUserRepos(process.env.GITHUB_TOKEN);
    res.json(repos);
  } catch (error) {
    res.status(502).json({ error: "Failed to fetch repositories from GitHub" });
  }
});

export default router;