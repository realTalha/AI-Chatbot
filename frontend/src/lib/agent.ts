import { apiFetch } from "@/lib/api";

export type AgentStreamEvent = {
  type: "started" | "progress" | "token" | "completed" | "error";
  message?: string;
  token?: string;
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

export async function listThreads() {
  return apiFetch<{ threads: ThreadSummary[] }>("/api/agent/threads");
}

export async function loadThread(threadId: string) {
  return apiFetch<{ threadId: string; messages: ThreadMessage[] }>(
    `/api/agent/threads/${threadId}`
  );
}

export async function streamAgentChat(
  input: { message: string; threadId: string },
  onEvent: (event: AgentStreamEvent) => void
) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!res.ok || !res.body) {
    throw new Error("Agent request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const blocks = buffer.split(/\n\n/);
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data) onEvent(JSON.parse(data) as AgentStreamEvent);
      }
    }

    if (done) break;
  }
}
