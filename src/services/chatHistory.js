import { prisma } from "../lib/prisma.js";

export async function saveMessage({ userId, repo, role, content, sources = [], jobId }) {
  return prisma.message.create({
    data: { userId, repo, role, content, sources, jobId },
  });
}

export async function getMessages(userId, repo) {
  return prisma.message.findMany({
    where: { userId, repo },
    orderBy: { createdAt: "asc" },
  });
}

export async function getUserRepos(userId) {
  return prisma.message.findMany({
    where: { userId },
    distinct: ["repo"],
    orderBy: { createdAt: "desc" },
    select: { repo: true, createdAt: true },
  });
}

export async function deleteMessagesForRepo(userId, repo) {
  return prisma.message.deleteMany({ where: { userId, repo } });
}