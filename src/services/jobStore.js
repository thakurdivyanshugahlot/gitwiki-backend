import { prisma } from "../lib/prisma.js";

export async function createJob(id, data = {}) {
  return prisma.job.create({
    data: {
      id,
      type: data.type,
      repo: data.repo,
      userId: data.userId,
      status: data.status || "pending",
      question: data.question,
      answer: data.answer,
      sources: data.sources || [],
      error: data.error,
      result: data.result,
    },
  });
}

export async function updateJob(id, patch) {
  try {
    return await prisma.job.update({
      where: { id },
      data: {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.answer !== undefined && { answer: patch.answer }),
        ...(patch.sources !== undefined && { sources: patch.sources }),
        ...(patch.error !== undefined && { error: patch.error }),
        ...(patch.result !== undefined && { result: patch.result }),
      },
    });
  } catch (err) {
    if (err.code === "P2025") return null; // job doesn't exist (e.g. stale restart)
    throw err;
  }
}

export async function getJob(id) {
  return prisma.job.findUnique({ where: { id } });
}