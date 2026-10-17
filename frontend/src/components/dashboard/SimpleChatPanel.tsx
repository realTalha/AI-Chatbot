"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle, MessageSquarePlus, Sparkles, MoreHorizontal, Pin, Trash2, Edit } from "lucide-react";
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
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [showMenuForThread, setShowMenuForThread] = useState<string | null>(null);
  const [pinnedThreadIds, setPinnedThreadIds] = useState<Set<string>>(new Set());
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmThread, setDeleteConfirmThread] = useState<ThreadSummary | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const showEmpty = messages.length === 1 && messages[0]?.id === "welcome" && !running;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMenuForThread(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showMenuForThread || showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMenuForThread, showUserMenu]);

  // Add style tag to customize scrollbar
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .chat-scroll-area {
        scrollbar-width: thin;
        scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
        overflow-y: scroll;
      }
      .chat-scroll-area::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .chat-scroll-area::-webkit-scrollbar-button:single-button {
        display: block;
        height: 0px;
        width: 0px;
        border-style: none;
        background-color: transparent;
      }
      .chat-scroll-area::-webkit-scrollbar-button:single-button:vertical:decrement {
        height: 0px;
        border-width: 0px;
      }
      .chat-scroll-area::-webkit-scrollbar-button:single-button:vertical:increment {
        height: 0px;
        border-width: 0px;
      }
      .chat-scroll-area::-webkit-scrollbar-track {
        background: transparent;
        border: none;
      }
      .chat-scroll-area::-webkit-scrollbar-track-piece {
        background: transparent;
      }
      .chat-scroll-area::-webkit-scrollbar-thumb {
        background: rgba(139, 92, 246, 0.3);
        border-radius: 4px;
        border: none;
      }
      .chat-scroll-area::-webkit-scrollbar-thumb:hover {
        background: rgba(139, 92, 246, 0.5);
      }
      .chat-scroll-area::-webkit-scrollbar-corner {
        background: transparent;
      }
      
      .composer-form-hover {
        transition: all 0.3s ease;
      }
      .composer-form-hover:hover {
        border-color: rgba(139, 92, 246, 0.6) !important;
        box-shadow: 0 0 40px rgba(124, 58, 237, 0.35) !important;
        background-image: linear-gradient(135deg, rgba(30, 31, 38, 0.9) 0%, rgba(19, 21, 26, 0.9) 100%) !important;
      }
      
      .suggestion-btn-hover {
        transition: all 0.3s ease;
      }
      .suggestion-btn-hover:hover:not(:disabled) {
        border-color: rgba(139, 92, 246, 0.6) !important;
        box-shadow: 0 0 40px rgba(124, 58, 237, 0.35) !important;
        background-color: rgba(30, 31, 38, 0.9) !important;
      }
      
      .new-chat-btn-hover {
        transition: all 0.3s ease;
      }
      .new-chat-btn-hover:hover:not(:disabled) {
        border-color: rgba(139, 92, 246, 0.6) !important;
        box-shadow: 0 0 40px rgba(124, 58, 237, 0.35) !important;
        background-image: linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(91, 33, 182, 0.2) 100%) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
    // Don't start a new chat if already on an empty welcome chat
    if (showEmpty) return;
    
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
      
      // Show scroll only when content exceeds max height
      if (textarea.scrollHeight > 120) {
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.overflowY = "hidden";
      }
    }
  }

  function handlePinThread(threadIdToPin: string) {
    setPinnedThreadIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(threadIdToPin)) {
        newSet.delete(threadIdToPin);
      } else {
        newSet.add(threadIdToPin);
      }
      return newSet;
    });
  }

  function handleStartRename(thread: ThreadSummary) {
    setRenamingThreadId(thread.id);
    setRenameValue(thread.title);
    setShowMenuForThread(null);
  }

  function handleRenameSubmit(threadIdToRename: string) {
    if (renameValue.trim()) {
      setThreads((prevThreads) =>
        prevThreads.map((t) =>
          t.id === threadIdToRename ? { ...t, title: renameValue.trim() } : t
        )
      );
    }
    setRenamingThreadId(null);
    setRenameValue("");
  }

  function handleDeleteThread(threadIdToDelete: string) {
    setThreads((prevThreads) => prevThreads.filter((t) => t.id !== threadIdToDelete));
    setPinnedThreadIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(threadIdToDelete);
      return newSet;
    });
    setShowMenuForThread(null);
    setDeleteConfirmThread(null);
    if (threadId === threadIdToDelete) {
      startNewChat();
    }
  }

  // Sort threads: pinned first, then by date
  const sortedThreads = [...threads].sort((a, b) => {
    const aIsPinned = pinnedThreadIds.has(a.id);
    const bIsPinned = pinnedThreadIds.has(b.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return 0;
  });

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
          <button onClick={startNewChat} style={styles.newChatBtn} disabled={running} className="new-chat-btn-hover">
            <MessageSquarePlus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        <div style={{ ...styles.separator }} />

        <div style={styles.chatsSection}>
          <p style={styles.chatsTitle}>Recent Chats</p>
          <div style={styles.chatsScroll} className="chat-scroll-area">
            {threads.length === 0 ? (
              <p style={styles.chatsEmpty}>No chats yet. Start one and it will show up here.</p>
            ) : (
              <div style={styles.threadList}>
                {sortedThreads.map((thread) => {
                  const active = thread.id === threadId;
                  const isHovered = hoveredThreadId === thread.id;
                  const isMenuOpen = showMenuForThread === thread.id;
                  const isPinned = pinnedThreadIds.has(thread.id);
                  const isRenaming = renamingThreadId === thread.id;
                  return (
                    <div
                      key={thread.id}
                      style={{
                        ...styles.threadContainer,
                        ...(isHovered ? styles.threadContainerHovered : {}),
                      }}
                      onMouseEnter={() => setHoveredThreadId(thread.id)}
                      onMouseLeave={() => setHoveredThreadId(null)}
                    >
                      {isRenaming ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameSubmit(thread.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRenameSubmit(thread.id);
                            } else if (e.key === "Escape") {
                              setRenamingThreadId(null);
                              setRenameValue("");
                            }
                          }}
                          autoFocus
                          style={styles.renameInput}
                        />
                      ) : (
                        <button
                          onClick={() => resumeThread(thread.id)}
                          disabled={running || loadingThread}
                          style={{
                            ...styles.threadBtn,
                            ...(active ? styles.threadBtnActive : styles.threadBtnIdle),
                          }}
                        >
                          <div style={styles.threadTitleRow}>
                            {isPinned && (
                              <Pin size={12} style={{ color: "#7c3aed", flexShrink: 0, transform: "rotate(45deg)" }} />
                            )}
                            <span style={styles.threadTitle}>{thread.title}</span>
                          </div>
                        </button>
                      )}
                      {(isHovered || isMenuOpen) && !isRenaming && (
                        <div style={styles.threadActions}>
                          <button
                            style={styles.threadActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePinThread(thread.id);
                            }}
                            title={isPinned ? "Unpin chat" : "Pin chat"}
                          >
                            <Pin 
                              size={15} 
                              style={{ 
                                color: isPinned ? "#7c3aed" : "#9ca3af",
                                fill: isPinned ? "#7c3aed" : "none",
                                transform: "rotate(45deg)"
                              }} 
                            />
                          </button>
                          <button
                            style={styles.threadActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenuForThread(isMenuOpen ? null : thread.id);
                            }}
                            title="More options"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      )}
                      {isMenuOpen && (
                        <div ref={dropdownRef} style={styles.dropdownMenu}>
                          <button
                            style={styles.dropdownItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(thread);
                            }}
                          >
                            <Edit size={14} />
                            <span>Rename</span>
                          </button>
                          <button
                            style={styles.dropdownItemDanger}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmThread(thread);
                              setShowMenuForThread(null);
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...styles.separator }} />

        <div style={styles.footer}>
          <div style={styles.userSection}>
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span style={styles.userName}>
                {userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1)}
              </span>
            </div>
            <div style={{ position: "relative" as const }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={styles.userMenuBtn}
                title="User options"
              >
                <MoreHorizontal size={18} />
              </button>
              {showUserMenu && (
                <div ref={userMenuRef} style={styles.userDropdownMenu}>
                  <button
                    style={styles.userDropdownItem}
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                  >
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
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
                        className="suggestion-btn-hover"
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
            <form onSubmit={onSubmit} style={styles.composerForm} className="composer-form-hover">
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

      {/* Delete Confirmation Popup */}
      {deleteConfirmThread && (
        <>
          <div style={styles.overlay} onClick={() => setDeleteConfirmThread(null)} />
          <div style={styles.deleteModal}>
            <div style={styles.deleteModalHeader}>
              <div style={styles.deleteIconWrapper}>
                <Trash2 size={24} style={{ color: "#ef4444" }} />
              </div>
              <h3 style={styles.deleteModalTitle}>Delete Chat?</h3>
              <p style={styles.deleteModalMessage}>
                Are you sure you want to delete <strong>"{deleteConfirmThread.title}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div style={styles.deleteModalActions}>
              <button
                onClick={() => setDeleteConfirmThread(null)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteThread(deleteConfirmThread.id)}
                style={styles.deleteBtn}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </>
      )}
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
  chatsSection: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" as const, padding: "1rem", paddingRight: "0" },
  chatsTitle: { fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: "0.75rem", letterSpacing: "0.05em", paddingLeft: "0.75rem" },
  chatsScroll: { flex: 1, overflowY: "auto" as const, overflowX: "hidden" as const, paddingRight: "0.5rem", paddingLeft: "0" },
  chatsEmpty: { fontSize: "0.875rem", color: "#6b7280", padding: "0.5rem" },
  threadList: { display: "flex", flexDirection: "column" as const, gap: "0.35rem", paddingLeft: "0" },
  threadContainer: { position: "relative" as const, display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "8px", transition: "all 0.2s ease" },
  threadContainerHovered: { backgroundColor: "rgba(124, 58, 237, 0.08)" },
  threadBtn: { textAlign: "left" as const, padding: "0.75rem", borderRadius: "8px", borderStyle: "none", backgroundColor: "transparent", cursor: "pointer", flex: 1, transition: "all 0.2s ease" },
  threadBtnActive: { backgroundImage: "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(91, 33, 182, 0.15) 100%)", borderLeftWidth: "3px", borderLeftStyle: "solid" as const, borderLeftColor: "#7c3aed" },
  threadBtnIdle: { backgroundColor: "transparent" },
  threadTitle: { display: "block", fontSize: "0.875rem", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, color: "#e8eaed" },
  threadTitleRow: { display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" },
  renameInput: { flex: 1, padding: "0.5rem 0.75rem", backgroundColor: "rgba(30, 31, 38, 0.8)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.5)", borderRadius: "6px", color: "#e8eaed", fontSize: "0.875rem", outline: "none" },
  threadActions: { display: "flex", gap: "0.25rem", position: "absolute" as const, right: "0.5rem", backgroundColor: "rgba(13, 14, 19, 0.95)", padding: "0.25rem", borderRadius: "6px" },
  threadActionBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "4px", borderStyle: "none", backgroundColor: "transparent", color: "#9ca3af", cursor: "pointer", transition: "all 0.2s ease" },
  dropdownMenu: { position: "absolute" as const, top: "100%", right: "0.5rem", backgroundColor: "rgba(30, 31, 38, 0.98)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.3)", borderRadius: "8px", padding: "0.5rem", marginTop: "0.25rem", zIndex: 10, minWidth: "140px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" },
  dropdownItem: { display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", padding: "0.5rem 0.75rem", borderStyle: "none", backgroundColor: "transparent", color: "#e8eaed", fontSize: "0.875rem", borderRadius: "4px", cursor: "pointer", transition: "all 0.2s ease", textAlign: "left" as const },
  dropdownItemDanger: { display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", padding: "0.5rem 0.75rem", borderStyle: "none", backgroundColor: "transparent", color: "#ef4444", fontSize: "0.875rem", borderRadius: "4px", cursor: "pointer", transition: "all 0.2s ease", textAlign: "left" as const },
  footer: { borderTop: "1px solid rgba(139, 92, 246, 0.15)", padding: "1rem" },
  userSection: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" },
  userInfo: { display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 },
  userAvatar: { width: "36px", height: "36px", borderRadius: "50%", backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.875rem", fontWeight: "600", flexShrink: 0 },
  userName: { fontSize: "0.875rem", color: "#e8eaed", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  userMenuBtn: { width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", borderStyle: "none", backgroundColor: "transparent", color: "#9ca3af", cursor: "pointer", transition: "all 0.2s ease" },
  userDropdownMenu: { position: "absolute" as const, bottom: "100%", right: "0", backgroundColor: "rgba(30, 31, 38, 0.98)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.3)", borderRadius: "8px", padding: "0.5rem", marginBottom: "0.5rem", zIndex: 10, minWidth: "120px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" },
  userDropdownItem: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "0.625rem 0.75rem", borderStyle: "none", backgroundColor: "transparent", color: "#e8eaed", fontSize: "0.875rem", borderRadius: "4px", cursor: "pointer", transition: "all 0.2s ease", textAlign: "center" as const, fontWeight: "500" },
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
  composerInput: { flex: 1, padding: "0.625rem 0.75rem", borderStyle: "none", outline: "none", resize: "none" as const, fontSize: "1rem", height: "44px", maxHeight: "120px", overflowY: "hidden" as const, backgroundColor: "transparent", color: "#e8eaed", lineHeight: "1.6" },
  sendBtn: { width: "44px", height: "44px", borderRadius: "10px", borderStyle: "none", backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)" },
  overlay: { position: "fixed" as const, inset: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)", zIndex: 50, animation: "fadeIn 0.2s ease" },
  deleteModal: { position: "fixed" as const, top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "rgba(19, 21, 26, 0.98)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.3)", borderRadius: "16px", padding: "2rem", maxWidth: "420px", width: "90%", zIndex: 51, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(124, 58, 237, 0.2)" },
  deleteModalHeader: { textAlign: "center" as const, marginBottom: "2rem" },
  deleteIconWrapper: { width: "64px", height: "64px", marginLeft: "auto", marginRight: "auto", marginBottom: "1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", borderWidth: "2px", borderStyle: "solid", borderColor: "rgba(239, 68, 68, 0.3)" },
  deleteModalTitle: { fontSize: "1.5rem", fontWeight: "600", color: "#e8eaed", marginBottom: "0.75rem", margin: 0 },
  deleteModalMessage: { fontSize: "0.9375rem", color: "#9ca3af", lineHeight: "1.6", margin: 0 },
  deleteModalActions: { display: "flex", gap: "0.75rem", justifyContent: "center" },
  cancelBtn: { flex: 1, padding: "0.75rem 1.5rem", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(139, 92, 246, 0.3)", borderRadius: "10px", backgroundColor: "rgba(30, 31, 38, 0.6)", color: "#e8eaed", fontSize: "0.9375rem", fontWeight: "500", cursor: "pointer", transition: "all 0.2s ease" },
  deleteBtn: { flex: 1, padding: "0.75rem 1.5rem", borderRadius: "10px", borderStyle: "none", backgroundImage: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white", fontSize: "0.9375rem", fontWeight: "500", cursor: "pointer", transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)" },
};
