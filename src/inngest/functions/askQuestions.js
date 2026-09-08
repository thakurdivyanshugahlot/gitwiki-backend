import { inngest } from "../client.js";
import { askQuestion } from "../../services/rag.js";
import { updateJob } from "../../services/jobStore.js";
import { saveMessage } from "../../services/chatHistory.js";

export const askQuestionFn = inngest.createFunction(
  { id: "ask-question", triggers: [{ event: "chat/question.requested" }] },
  async ({ event, step }) => {
    const { jobId, repo, question, userId } = event.data;

    try {
      const result = await step.run("retrieve-and-answer", () =>
        askQuestion(repo, question, {
          onProgress: (partial) => updateJob(jobId, { status: "pending", answer: partial }),
        })
      );

      await step.run("save-assistant-message", () =>
        saveMessage({
          userId,
          repo,
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          jobId,
        })
      );

      if (jobId) {
        await updateJob(jobId, { status: "completed", answer: result.answer, sources: result.sources });
      }

      return { repo, question, status: "completed", ...result };
    } catch (error) {
      if (jobId) await updateJob(jobId, { status: "failed", error: error.message });
      throw error;
    }
  }
);