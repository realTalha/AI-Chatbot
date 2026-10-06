import { streamText, CoreMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  getOrCreateThread,
  getThreadById,
  getThreadMessages as getThreadMessagesFromDb,
  listUserThreads as listThreadsFromDb,
  saveMessage,
  updateThreadTitle,
} from "../repositories/thread.repository.js";

export type AgentEvent = {
  type: "started" | "progress" | "token" | "completed" | "error";
  message?: string;
  token?: string;
};

export type StreamAgentReplyInput = {
  userId: string;
  authUserId: string;
  threadId: string;
  message: string;
  onEvent: (event: AgentEvent) => void;
};

export type ThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ThreadMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

const SYSTEM_INSTRUCTIONS = `You are a helpful AI assistant with working memory capabilities.

Memory:
- Remember user preferences and context across conversations.
- Use conversation history to maintain context.
- Provide personalized and contextual responses.

How to respond:
- Be conversational, clear, and concise.
- Match your response style to the user's question - detailed when needed, brief when appropriate.
- Use markdown formatting for better readability.
- Skip filler closings unless the user seems stuck.
- Never invent information that wasn't provided or that you don't know.

Markdown formatting:
- Use short paragraphs and bullet lists for clarity.
- Format links properly: [Link text](url) instead of bare URLs.
- Use **bold** sparingly for emphasis on key points.
- Use code blocks for code snippets with appropriate language tags.

Current time: ${new Date().toISOString()}`;

function getModel() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set in env");
  }

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const modelName = process.env.AI_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free";
  return openrouter(modelName);
}

export async function listUserThreads(userId: string): Promise<ThreadSummary[]> {
  const threads = await listThreadsFromDb(userId);

  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title || "Untitled Chat",
    updatedAt: thread.updated_at.toISOString(),
  }));
}

export async function getThreadMessages(
  userId: string,
  threadId: string,
): Promise<ThreadMessage[]> {
  const thread = await getThreadById({ threadId, userId });

  if (!thread) {
    throw new Error("Thread not found");
  }

  const messages = await getThreadMessagesFromDb(threadId);

  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
  }));
}

export async function streamAgentReply(input: StreamAgentReplyInput) {
  input.onEvent({
    type: "started",
    message: "Agent is thinking",
  });

  // Ensure thread exists
  await getOrCreateThread({
    threadId: input.threadId,
    userId: input.userId,
  });

  // Save user message
  await saveMessage({
    threadId: input.threadId,
    role: "user",
    content: input.message,
  });

  // Get conversation history
  const history = await getThreadMessagesFromDb(input.threadId);
  
  // Build messages array for AI SDK
  const messages: CoreMessage[] = [
    { role: "system", content: SYSTEM_INSTRUCTIONS },
    ...history.slice(-20).map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    })),
  ];

  let fullResponse = "";

  try {
    const result = await streamText({
      model: getModel(),
      messages,
      maxTokens: 2000,
      temperature: 0.7,
    });

    for await (const textPart of result.textStream) {
      fullResponse += textPart;
      input.onEvent({
        type: "token",
        token: textPart,
      });
    }

    // Save assistant response
    await saveMessage({
      threadId: input.threadId,
      role: "assistant",
      content: fullResponse,
    });

    // Update thread title if it's the first message
    const thread = await getThreadById({
      threadId: input.threadId,
      userId: input.userId,
    });

    if (thread && thread.title === "New Conversation") {
      await updateThreadTitle({
        threadId: input.threadId,
        title: input.message.slice(0, 80),
      });
    }

    input.onEvent({
      type: "completed",
      message: "done",
    });
  } catch (error) {
    input.onEvent({
      type: "error",
      message: error instanceof Error ? error.message : "Agent failed",
    });
    throw error;
  }
}
