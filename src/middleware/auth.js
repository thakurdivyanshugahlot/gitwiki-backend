import { getAuth } from "@clerk/express";

export const clerkConfigured = Boolean(
  process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export function requireUser(req, res, next) {
  if (!clerkConfigured) {
    return res.status(503).json({ error: "Clerk authentication is not configured" });
  }

  const { isAuthenticated } = getAuth(req);

  if (!isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}