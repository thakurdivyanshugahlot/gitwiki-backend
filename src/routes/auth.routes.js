import { Router } from "express";
import { getAuth } from "@clerk/express";
import { requireUser } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireUser, (req, res) => {
  res.json({ userId: getAuth(req).userId });
});

export default router;