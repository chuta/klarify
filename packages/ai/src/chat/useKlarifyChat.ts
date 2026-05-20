// =============================================================================
// useKlarifyChat — the single React hook the chat UI consumes.
//
// Responsibilities:
//   * Track the active conversation's messages + streaming state.
//   * Stream new responses from POST /api/ai/chat (SSE).
//   * Maintain a sidebar list of past conversations (GET /api/ai/conversations).
//   * Load a specific conversation on demand (GET /api/ai/conversations/:id).
//   * Soft-delete conversations (DELETE /api/ai/conversations/:id).
//   * Persist the active conversationId to localStorage so a page refresh
//     (or accidental tab close) doesn't lose the user's place.
//
// Why a hook (not a context/store):
//   * The chat screen is the only consumer. Adding a global store adds
//     boilerplate for zero benefit.
//   * Hot-loaded by Next.js with "use client". Stays out of the server bundle.
// =============================================================================
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Citation } from './citations.js';
import { streamChat, type StreamEvent } from './streaming.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  /** True while the assistant message is still streaming. */
  streaming?: boolean;
  /** True if Claude emitted an error event mid-stream. */
  errored?: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface UseKlarifyChatOptions {
  /** Base URL of the Klarify API. Defaults to NEXT_PUBLIC_API_URL. */
  apiBaseUrl?: string;
  /** Function that returns a fresh Supabase access token. Called on every request. */
  getAuthToken: () => Promise<string | null>;
  /** localStorage key for the active conversation id. Override for testing. */
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'klarify.activeConversationId';

interface QueryQuota {
  used: number;
  limit: number | null; // null = unlimited
  plan: string;
}

export interface UseKlarifyChatReturn {
  /** Ordered list of messages in the active conversation (oldest first). */
  messages: ChatMessage[];
  /** The active conversation's id, or null when starting fresh. */
  conversationId: string | null;
  /** Live list of recent conversations for the sidebar. */
  conversations: ConversationSummary[];
  /** True while the chat is fetching/streaming or loading conversations. */
  isLoading: boolean;
  /** True specifically while the assistant message is streaming. */
  isStreaming: boolean;
  /** Last error from a chat/list/load call, surfaced to the UI. */
  error: string | null;
  /** Monthly AI query quota (refreshed on every `done` event). */
  quota: QueryQuota | null;
  /** Send the next user message; opens a new conversation if none active. */
  sendMessage: (text: string) => Promise<void>;
  /** Cancel an in-flight streaming response. */
  stopStreaming: () => void;
  /** Start a new conversation (clears active id and message list). */
  newConversation: () => void;
  /** Load a saved conversation by id. */
  loadConversation: (id: string) => Promise<void>;
  /** Soft-delete a conversation. If it was active, also clears the message list. */
  deleteConversation: (id: string) => Promise<void>;
  /** Refresh the conversations list from the API. */
  refreshConversations: () => Promise<void>;
}

export function useKlarifyChat(
  options: UseKlarifyChatOptions,
): UseKlarifyChatReturn {
  const apiBaseUrl =
    options.apiBaseUrl ??
    (typeof process !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL ?? '')
      : '');
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const getAuthToken = options.getAuthToken;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QueryQuota | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ----- helpers -----
  const requireToken = useCallback(async (): Promise<string> => {
    const token = await getAuthToken();
    if (!token) throw new Error('You must be signed in to chat with Klarify.');
    return token;
  }, [getAuthToken]);

  const apiUrl = useCallback(
    (path: string): string => {
      const base = apiBaseUrl.replace(/\/$/, '');
      return `${base}${path}`;
    },
    [apiBaseUrl],
  );

  // ----- conversations list -----
  const refreshConversations = useCallback(async (): Promise<void> => {
    try {
      const token = await getAuthToken();
      if (!token) return; // unauth UI handles the redirect
      const res = await fetch(apiUrl('/api/ai/conversations'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`);
      const body = (await res.json()) as
        | { success?: boolean; data?: unknown }
        | undefined;
      if (body?.success && Array.isArray(body.data)) {
        setConversations(body.data as ConversationSummary[]);
      }
    } catch (err) {
      // Sidebar failure is non-fatal — keep showing whatever we had last.
      console.warn('[useKlarifyChat] refreshConversations:', (err as Error).message);
    }
  }, [apiUrl, getAuthToken]);

  // ----- load a saved conversation -----
  const loadConversation = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      setIsLoading(true);
      try {
        const token = await requireToken();
        const res = await fetch(apiUrl(`/api/ai/conversations/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load conversation: ${res.status}`);
        const body = (await res.json()) as
          | { success?: boolean; error?: string; data?: unknown }
          | undefined;
        if (!body?.success) throw new Error(body?.error ?? 'Unknown error');
        const data = body.data as {
          id: string;
          messages: Array<{
            id: string;
            role: string;
            content: string;
            citations: unknown;
            createdAt: string;
          }>;
        };
        setConversationId(data.id);
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
            citations: Array.isArray(m.citations) ? (m.citations as Citation[]) : [],
            createdAt: m.createdAt,
          })),
        );
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, data.id);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, requireToken, storageKey],
  );

  // ----- delete -----
  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      try {
        const token = await requireToken();
        const res = await fetch(apiUrl(`/api/ai/conversations/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok && res.status !== 404) {
          throw new Error(`Failed to delete conversation: ${res.status}`);
        }
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (id === conversationId) {
          setConversationId(null);
          setMessages([]);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(storageKey);
          }
        }
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [apiUrl, conversationId, requireToken, storageKey],
  );

  // ----- new conversation -----
  const newConversation = useCallback((): void => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // ----- cancel current stream -----
  const stopStreaming = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // ----- send message + stream response -----
  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (isStreaming) return; // ignore double-submits

      setError(null);

      // Optimistic user message render.
      const optimisticUserId = `optimistic-user-${Date.now()}`;
      const optimisticAssistantId = `optimistic-assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticUserId,
          role: 'user',
          content: trimmed,
          citations: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: optimisticAssistantId,
          role: 'assistant',
          content: '',
          citations: [],
          streaming: true,
          createdAt: new Date().toISOString(),
        },
      ]);

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = await requireToken();
        await streamChat(
          {
            url: apiUrl('/api/ai/chat'),
            message: trimmed,
            conversationId,
            authToken: token,
            signal: controller.signal,
          },
          (event: StreamEvent) => {
            if (event.type === 'chunk') {
              setMessages((prev) => {
                const next = [...prev];
                const lastIdx = next.length - 1;
                const last = next[lastIdx];
                if (last && last.role === 'assistant') {
                  next[lastIdx] = { ...last, content: last.content + event.content };
                }
                return next;
              });
            } else if (event.type === 'done') {
              setMessages((prev) => {
                const next = [...prev];
                const lastIdx = next.length - 1;
                const last = next[lastIdx];
                if (last && last.role === 'assistant') {
                  next[lastIdx] = {
                    ...last,
                    id: event.messageId,
                    citations: event.citations,
                    streaming: false,
                  };
                }
                return next;
              });
              setConversationId(event.conversationId);
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(storageKey, event.conversationId);
              }
              setQuota({
                used: event.queriesUsed,
                limit: event.queriesLimit,
                plan: event.plan,
              });
              // Refresh sidebar so the new/updated conversation shows up.
              void refreshConversations();
            } else if (event.type === 'error') {
              setMessages((prev) => {
                const next = [...prev];
                const lastIdx = next.length - 1;
                const last = next[lastIdx];
                if (last && last.role === 'assistant') {
                  next[lastIdx] = { ...last, errored: true, streaming: false };
                }
                return next;
              });
              setError(event.message);
            }
          },
        );
      } catch (err) {
        const e = err as Error & { code?: string; details?: unknown };
        if (e.name === 'AbortError') {
          // user cancelled — clean up assistant placeholder
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        } else {
          setError(e.message);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, streaming: false, errored: true };
            }
            return next;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [
      apiUrl,
      conversationId,
      isStreaming,
      refreshConversations,
      requireToken,
      storageKey,
    ],
  );

  // ----- restore on mount: load saved conversation id if present -----
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey);
    void refreshConversations();
    if (saved) void loadConversation(saved);
    // run-once on mount — exhaustive deps would create a loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    messages,
    conversationId,
    conversations,
    isLoading,
    isStreaming,
    error,
    quota,
    sendMessage,
    stopStreaming,
    newConversation,
    loadConversation,
    deleteConversation,
    refreshConversations,
  };
}
