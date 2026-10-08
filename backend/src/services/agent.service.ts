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

  // Use a valid free model from OpenRouter
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
  let streamedChunks = 0;

  try {
    console.log("Streaming with model:", process.env.AI_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free");
    
    const result = await streamText({
      model: getModel(),
      messages,
      maxTokens: 4000,
      temperature: 0.7,
    });

    // Stream the text response
    for await (const textPart of result.textStream) {
      if (textPart && textPart.length > 0) {
        fullResponse += textPart;
        streamedChunks++;
        input.onEvent({
          type: "token",
          token: textPart,
        });
      }
    }

    console.log(`Received ${streamedChunks} chunks, total length: ${fullResponse.length}`);

    // Ensure we have a response
    if (!fullResponse || fullResponse.trim().length === 0) {
      console.error("Empty response from model");
      
      // Provide a helpful fallback message
      const fallbackMessage = "I apologize, but I couldn't generate a response. This might be due to:\n\n" +
        "- The AI model being temporarily unavailable\n" +
        "- Rate limits being reached\n" +
        "- The question containing an unusual name combination\n\n" +
        "Please try:\n" +
        "1. Rephrasing your question\n" +
        "2. Asking something different\n" +
        "3. Waiting a moment and trying again";
      
      fullResponse = fallbackMessage;
      
      // Stream the fallback message
      input.onEvent({
        type: "token",
        token: fallbackMessage,
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
    console.error("Agent streaming error:", error);
    
    // Provide a user-friendly error message
    const errorMsg = error instanceof Error 
      ? `AI Error: ${error.message}` 
      : "The AI service encountered an error. Please try again.";
    
    input.onEvent({
      type: "error",
      message: errorMsg,
    });
    
    throw error;
  }
}
