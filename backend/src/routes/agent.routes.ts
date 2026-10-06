import { Router } from "express";
import { requireAuth } from "../middleware/session.js";
import {
  getThreadMessages,
  listUserThreads,
  streamAgentReply,
} from "../services/agent.service.js";

export const agentRoutes = Router();

agentRoutes.use(requireAuth);

agentRoutes.get("/threads", async (req, res) => {
  try {
    const threads = await listUserThreads(req.session.user!.userId);
    res.json({ threads });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to list threads";
    res.status(500).json({ error: message });
  }
});

agentRoutes.get("/threads/:threadId", async (req, res) => {
  const threadId = req.params.threadId;

  if (!threadId || threadId.length < 10) {
    res.status(400).json({ error: "Invalid threadId" });
    return;
  }

  try {
    const messages = await getThreadMessages(req.session.user!.userId, threadId);
    res.json({ threadId, messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to get thread messages";
    res.status(500).json({ error: message });
  }
});

agentRoutes.post("/chat", async (req, res) => {
  const { message, threadId } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (!threadId || typeof threadId !== "string") {
    res.status(400).json({ error: "ThreadId is required" });
    return;
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const write = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await streamAgentReply({
      userId: req.session.user!.userId,
      authUserId: req.session.user!.userId,
      threadId,
      message: message.trim(),
      onEvent: write,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "failed to stream chat";
    write({ type: "error", message: errorMessage });
  } finally {
    res.end();
  }
});
