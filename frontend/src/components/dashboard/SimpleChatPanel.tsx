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

const SUGGESTION_CATEGORIES = {
  general: [
    "What can you help me with?",
    "Tell me about your capabilities",
    "How do I get started?",
    "What kind of questions can I ask?",
  ],
  productivity: [
    "Help me brainstorm ideas",
    "Explain a complex topic simply",
    "Review and improve my writing",
    "Help me solve a problem",
  ],
  news: [
    "What's happening in the world today?",
    "Show me the latest news headlines",
    "Any important updates today?",
    "What's trending right now?",
  ],
  tech: [
    "Latest technology news",
    "What's new in AI development?",
    "Tell me about recent tech innovations",
    "Explain a programming concept",
  ],
};

function getRandomSuggestions(): string[] {
  const categories = Object.values(SUGGESTION_CATEGORIES);
  const allSuggestions = categories.flat();
  const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

export default function SimpleChatPanel({ onLogout, userEmail }: { onLogout: () => void; userEmail: string }) {
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", content: "" }]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(() => getRandomSuggestions());

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setMessages([{ id: "welcome", role: "assistant", content: "" }]);
    setPrompt("");
    setSuggestions(getRandomSuggestions());
  }

  async function resumeThread(nextThreadId: string) {
    if (running || loadingThread || nextThreadId === threadId) return;
    setLoadingThread(true);
    setProgress(null);

    try {
      const data = await loadThread(nextThreadId);
      setThreadId(data.threadId);
      setMessages(data.messages.length > 0 ? data.messages : [{ id: "welcome", role: "assistant", content: "" }]);
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

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value);
    
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px (2.5x of ~48px)
      textarea.style.height = `${newHeight}px`;
    }
  }

  return (
    <div style={styles.root}>
      <aside style={styles.aside}>
        <div style={styles.brandRow}>
          <div style={styles.brandLeft}>
            <Sparkles size={24} style={{ color: "#7c3aed" }} />
            <div>
              <p style={styles.brandTitle}>Genie AI</p>
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
        <div style={styles.chatColumn}>
          <div style={styles.messagesScroll}>
            <div style={styles.messagesInner}>
              {showEmpty ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    <Sparkles size={32} />
                  </div>
                  <h2 style={styles.emptyTitle}>Genie AI</h2>
                  <p style={styles.emptyCopy}>Where simplicity meets brilliance - Your personal AI powerhouse for ideas, insights, and intelligent solutions.</p>
                  <div style={styles.suggestions}>
                    {suggestions.map((suggestion) => (
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
                ref={textareaRef}
                value={prompt}
                onChange={handleInputChange}
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
  root: { display: "flex", height: "100vh", overflow: "hidden", backgroundImage: "linear-gradient(135deg, #0a0b0f 0%, #13151a 50%, #0a0b0f 100%)" },
  aside: { width: "280px", borderRight: "1px solid rgba(139, 92, 246, 0.15)", display: "flex", flexDirection: "column" as const, backgroundImage: "linear-gradient(180deg, rgba(13, 14, 19, 0.95) 0%, rgba(10, 11, 15, 0.95) 100%)", backdropFilter: "blur(10px)" },
  brandRow: { padding: "1rem", borderBottom: "1px solid rgba(139, 92, 246, 0.15)" },
  brandLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  brandTitle: { fontSize: "1.125rem", fontWeight: "600", color: "#e8eaed" },
  topActions: { padding: "1rem", display: "flex", flexDirection: "column" as const, gap: "0.5rem" },
  newChatBtn: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.3)", borderRadius: "10px", backgroundImage: "linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(91, 33, 182, 0.1) 100%)", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", color: "#c4b5fd", transition: "all 0.2s ease" },
  separator: { height: "1px", backgroundColor: "rgba(139, 92, 246, 0.15)", marginLeft: "1rem", marginRight: "1rem" },
  chatsSection: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" as const, padding: "1rem" },
  chatsTitle: { fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: "0.75rem", letterSpacing: "0.05em" },
  chatsScroll: { flex: 1, overflow: "auto" },
  chatsEmpty: { fontSize: "0.875rem", color: "#6b7280", padding: "0.5rem" },
  threadList: { display: "flex", flexDirection: "column" as const, gap: "0.35rem" },
  threadBtn: { textAlign: "left" as const, padding: "0.75rem", borderRadius: "8px", borderStyle: "none", backgroundColor: "transparent", cursor: "pointer", width: "100%", transition: "all 0.2s ease" },
  threadBtnActive: { backgroundImage: "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(91, 33, 182, 0.15) 100%)", borderLeftWidth: "3px", borderLeftStyle: "solid" as const, borderLeftColor: "#7c3aed" },
  threadBtnIdle: { backgroundColor: "transparent" },
  threadTitle: { display: "block", fontSize: "0.875rem", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, color: "#e8eaed" },
  threadTime: { display: "block", fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" },
  footer: { borderTop: "1px solid rgba(139, 92, 246, 0.15)", padding: "1rem" },
  userLabel: { fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  logoutBtn: { width: "100%", padding: "0.625rem", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.2)", borderRadius: "8px", backgroundColor: "rgba(30, 31, 38, 0.6)", cursor: "pointer", fontSize: "0.875rem", color: "#e8eaed", fontWeight: "500", transition: "all 0.2s ease" },
  main: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  chatColumn: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  messagesScroll: { flex: 1, overflowY: "auto" as const, overflowX: "hidden" as const, display: "flex" },
  messagesInner: { maxWidth: "768px", marginLeft: "auto", marginRight: "auto", width: "100%", flex: 1, display: "flex", flexDirection: "column" as const },
  emptyState: { textAlign: "center" as const, padding: "2rem 1rem", display: "flex", flexDirection: "column" as const, justifyContent: "center", alignItems: "center", flex: 1 },
  emptyIcon: { width: "72px", height: "72px", marginLeft: "auto", marginRight: "auto", marginBottom: "1.5rem", backgroundImage: "linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(91, 33, 182, 0.1) 100%)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa", boxShadow: "0 0 30px rgba(124, 58, 237, 0.3)" },
  emptyTitle: { fontSize: "2.25rem", fontWeight: "700", marginBottom: "1rem", backgroundImage: "linear-gradient(135deg, #c4b5fd 0%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
  emptyCopy: { fontSize: "1rem", color: "#9ca3af", marginBottom: "2rem", maxWidth: "28rem", marginLeft: "auto", marginRight: "auto" },
  suggestions: { display: "flex", flexWrap: "wrap" as const, gap: "0.625rem", justifyContent: "center", marginTop: "2rem" },
  suggestionBtn: { padding: "0.625rem 1.25rem", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.3)", borderRadius: "24px", backgroundColor: "rgba(30, 31, 38, 0.6)", cursor: "pointer", fontSize: "0.875rem", color: "#c4b5fd", transition: "all 0.2s ease", fontWeight: "500" },
  messageList: { display: "flex", flexDirection: "column" as const, gap: "1.5rem", padding: "2rem 1rem" },
  statusRow: { display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.875rem", color: "#9ca3af" },
  messageRow: { display: "flex", width: "100%" },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAssistant: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", padding: "1rem 1.25rem", borderRadius: "16px", wordBreak: "break-word" as const },
  bubbleUser: { backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", color: "white", borderBottomRightRadius: "4px", boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)" },
  bubbleAssistant: { backgroundImage: "linear-gradient(135deg, rgba(30, 31, 38, 0.8) 0%, rgba(19, 21, 26, 0.8) 100%)", color: "#e8eaed", borderBottomLeftRadius: "4px", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.15)" },
  bubbleSystem: { backgroundColor: "rgba(124, 58, 237, 0.1)", color: "#a78bfa", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(124, 58, 237, 0.2)" },
  thinking: { display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.875rem", color: "#9ca3af" },
  userText: { whiteSpace: "pre-wrap" as const, margin: 0, lineHeight: "1.6" },
  composerWrap: { borderTop: "1px solid rgba(139, 92, 246, 0.15)", padding: "1.25rem", backgroundColor: "rgba(10, 11, 15, 0.8)", backdropFilter: "blur(10px)" },
  composerForm: { maxWidth: "768px", marginLeft: "auto", marginRight: "auto", display: "flex", gap: "0.75rem", alignItems: "flex-end", backgroundImage: "linear-gradient(135deg, rgba(30, 31, 38, 0.8) 0%, rgba(19, 21, 26, 0.8) 100%)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.3)", borderRadius: "16px", padding: "0.75rem", boxShadow: "0 0 30px rgba(124, 58, 237, 0.2)" },
  composerInput: { flex: 1, padding: "0.625rem 0.75rem", borderStyle: "none", outline: "none", resize: "none" as const, fontSize: "1rem", height: "40px", maxHeight: "120px", overflowY: "auto" as const, backgroundColor: "transparent", color: "#e8eaed", lineHeight: "1.5" },
  sendBtn: { width: "44px", height: "44px", borderRadius: "10px", borderStyle: "none", backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)" },
};
