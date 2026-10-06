"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle, MessageSquarePlus, Sparkles } from "lucide-react";
import { listThreads, loadThread, streamAgentChat, ThreadSummary } from "@/lib/agent";
import { MarkdownMessage } from "./markdown-message";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

const WELCOME = "Hi! I'm your AI assistant. Ask me anything - I'm here to help with questions, ideas, or just chat.";

const SUGGESTIONS = [
  "What can you help me with?",
  "Explain quantum computing simply",
  "Help me brainstorm project ideas",
  "What are the latest trends in AI?",
];

export default function SimpleChatPanel({ onLogout, userEmail }: { onLogout: () => void; userEmail: string }) {
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", content: WELCOME }]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const showEmpty = messages.length === 1 && messages[0]?.id === "welcome" && !running;

  const refreshThreads = useCallback(async () => {
    try {
      const data = await listThreads();
      setThreads(data.threads);
    } catch {}
  }, []);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, progress]);

  function startNewChat() {
    if (running) return;
    setThreadId(crypto.randomUUID());
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
    setPrompt("");
  }

  async function resumeThread(nextThreadId: string) {
    if (running || loadingThread || nextThreadId === threadId) return;
    setLoadingThread(true);
    setProgress(null);

    try {
      const data = await loadThread(nextThreadId);
      setThreadId(data.threadId);
      setMessages(data.messages.length > 0 ? data.messages : [{ id: "welcome", role: "assistant", content: WELCOME }]);
      setPrompt("");
    } catch {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "system", content: "Could not load the chat" },
      ]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || running || loadingThread) return;

    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
      { id: assistantId, role: "assistant", content: "" },
    ]);

    setPrompt("");
    setRunning(true);
    setProgress(null);

    try {
      await streamAgentChat({ message: trimmed, threadId }, (event) => {
        if (event.type === "progress" && event.message) {
          setProgress(event.message);
        }
        if (event.type === "token" && event.token) {
          setProgress(null);
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, content: message.content + event.token } : message
            )
          );
        }
        if (event.type === "error") {
          setProgress(null);
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, content: event.message ?? "Agent failed" } : message
            )
          );
        }
      });

      refreshThreads();
    } catch {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "system", content: "Could not reach the agent API" },
      ]);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(prompt);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(prompt);
    }
  }

  return (
    <div style={styles.root}>
      <aside style={styles.aside}>
        <div style={styles.brandRow}>
          <div style={styles.brandLeft}>
            <Sparkles size={24} style={{ color: "#2563eb" }} />
            <div>
              <p style={styles.brandTitle}>AI Assistant</p>
            </div>
          </div>
        </div>

        <div style={styles.topActions}>
          <button onClick={startNewChat} style={styles.newChatBtn} disabled={running}>
            <MessageSquarePlus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        <div style={{ ...styles.separator }} />

        <div style={styles.chatsSection}>
          <p style={styles.chatsTitle}>Chats</p>
          <div style={styles.chatsScroll}>
            {threads.length === 0 ? (
              <p style={styles.chatsEmpty}>No chats yet. Start one and it will show up here.</p>
            ) : (
              <div style={styles.threadList}>
                {threads.map((thread) => {
                  const active = thread.id === threadId;
                  return (
                    <button
                      key={thread.id}
                      onClick={() => resumeThread(thread.id)}
                      disabled={running || loadingThread}
                      style={{
                        ...styles.threadBtn,
                        ...(active ? styles.threadBtnActive : styles.threadBtnIdle),
                      }}
                    >
                      <span style={styles.threadTitle}>{thread.title}</span>
                      <span style={styles.threadTime}>{new Date(thread.updatedAt).toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...styles.separator }} />

        <div style={styles.footer}>
          <div style={styles.userLabel}>{userEmail}</div>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Log out
          </button>
        </div>
      </aside>

      <section style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerText}>
            <p style={styles.headerTitle}>Assistant</p>
            <p style={styles.headerSubtitle}>Your intelligent conversation partner</p>
          </div>
        </header>

        <div style={styles.chatColumn}>
          <div style={styles.messagesScroll}>
            <div style={styles.messagesInner}>
              {showEmpty ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    <Sparkles size={32} />
                  </div>
                  <h2 style={styles.emptyTitle}>AI Assistant</h2>
                  <p style={styles.emptyCopy}>{WELCOME}</p>
                  <div style={styles.suggestions}>
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        disabled={running || loadingThread}
                        style={styles.suggestionBtn}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.messageList}>
                  {loadingThread ? (
                    <div style={styles.statusRow}>
                      <LoaderCircle size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Loading Chat...
                    </div>
                  ) : (
                    messages.map((message) => {
                      if (message.id === "welcome" && messages.length > 1) return null;

                      return (
                        <div
                          key={message.id}
                          style={{
                            ...styles.messageRow,
                            ...(message.role === "user" ? styles.messageRowUser : styles.messageRowAssistant),
                          }}
                        >
                          <div
                            style={{
                              ...styles.bubble,
                              ...(message.role === "user" && styles.bubbleUser),
                              ...(message.role === "assistant" && styles.bubbleAssistant),
                              ...(message.role === "system" && styles.bubbleSystem),
                            }}
                          >
                            {!message.content && running ? (
                              <span style={styles.thinking}>
                                <LoaderCircle size={14} style={{ animation: "spin 1s linear infinite" }} />
                                Thinking...
                              </span>
                            ) : message.role === "user" ? (
                              <p style={styles.userText}>{message.content}</p>
                            ) : (
                              <MarkdownMessage content={message.content} tone={message.role === "system" ? "system" : "assistant"} />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {progress && (
                    <div style={styles.statusRow}>
                      <LoaderCircle size={14} style={{ animation: "spin 1s linear infinite" }} />
                      {progress}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </div>

          <div style={styles.composerWrap}>
            <form onSubmit={onSubmit} style={styles.composerForm}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={1}
                onKeyDown={onKeyDown}
                disabled={running}
                placeholder="Ask me anything..."
                style={styles.composerInput}
              />
              <button type="submit" disabled={!prompt.trim() || running} style={styles.sendBtn}>
                {running ? <LoaderCircle size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowUp size={16} />}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  root: { display: "flex", height: "100vh", overflow: "hidden" },
  aside: { width: "280px", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" as const, backgroundColor: "#f9fafb" },
  brandRow: { padding: "1rem", borderBottom: "1px solid #e5e7eb" },
  brandLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  brandTitle: { fontSize: "1.125rem", fontWeight: "600" },
  topActions: { padding: "1rem", display: "flex", flexDirection: "column" as const, gap: "0.5rem" },
  newChatBtn: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "white", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" },
  separator: { height: "1px", backgroundColor: "#e5e7eb", margin: "0 1rem" },
  chatsSection: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" as const, padding: "1rem" },
  chatsTitle: { fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "0.5rem" },
  chatsScroll: { flex: 1, overflow: "auto" },
  chatsEmpty: { fontSize: "0.875rem", color: "#6b7280", padding: "0.5rem" },
  threadList: { display: "flex", flexDirection: "column" as const, gap: "0.25rem" },
  threadBtn: { textAlign: "left" as const, padding: "0.625rem", borderRadius: "6px", border: "none", backgroundColor: "transparent", cursor: "pointer", width: "100%" },
  threadBtnActive: { backgroundColor: "#e0e7ff" },
  threadBtnIdle: { backgroundColor: "transparent" },
  threadTitle: { display: "block", fontSize: "0.875rem", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  threadTime: { display: "block", fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" },
  footer: { borderTop: "1px solid #e5e7eb", padding: "1rem" },
  userLabel: { fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  logoutBtn: { width: "100%", padding: "0.5rem", border: "none", borderRadius: "6px", backgroundColor: "#f3f4f6", cursor: "pointer", fontSize: "0.875rem" },
  main: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  header: { padding: "1rem", borderBottom: "1px solid #e5e7eb" },
  headerText: {},
  headerTitle: { fontSize: "1.125rem", fontWeight: "600" },
  headerSubtitle: { fontSize: "0.875rem", color: "#6b7280" },
  chatColumn: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  messagesScroll: { flex: 1, overflow: "auto" },
  messagesInner: { maxWidth: "768px", margin: "0 auto", padding: "2rem 1rem" },
  emptyState: { textAlign: "center" as const, padding: "3rem 1rem" },
  emptyIcon: { width: "64px", height: "64px", margin: "0 auto 1rem", backgroundColor: "#e0e7ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" },
  emptyTitle: { fontSize: "2rem", fontWeight: "700", marginBottom: "0.75rem" },
  emptyCopy: { fontSize: "1rem", color: "#6b7280", marginBottom: "2rem", maxWidth: "28rem", margin: "0 auto" },
  suggestions: { display: "flex", flexWrap: "wrap" as const, gap: "0.5rem", justifyContent: "center", marginTop: "2rem" },
  suggestionBtn: { padding: "0.5rem 1rem", border: "1px solid #e5e7eb", borderRadius: "20px", backgroundColor: "white", cursor: "pointer", fontSize: "0.875rem" },
  messageList: { display: "flex", flexDirection: "column" as const, gap: "1.5rem" },
  statusRow: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280" },
  messageRow: { display: "flex", width: "100%" },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAssistant: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", padding: "0.75rem 1rem", borderRadius: "12px", wordBreak: "break-word" as const },
  bubbleUser: { backgroundColor: "#2563eb", color: "white", borderBottomRightRadius: "4px" },
  bubbleAssistant: { backgroundColor: "#f3f4f6", color: "#1f2937", borderBottomLeftRadius: "4px" },
  bubbleSystem: { backgroundColor: "#fef3c7", color: "#92400e" },
  thinking: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280" },
  userText: { whiteSpace: "pre-wrap" as const, margin: 0 },
  composerWrap: { borderTop: "1px solid #e5e7eb", padding: "1rem" },
  composerForm: { maxWidth: "768px", margin: "0 auto", display: "flex", gap: "0.5rem", alignItems: "flex-end", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "0.5rem" },
  composerInput: { flex: 1, padding: "0.625rem", border: "none", outline: "none", resize: "none" as const, fontSize: "1rem", maxHeight: "200px" },
  sendBtn: { width: "40px", height: "40px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
};
