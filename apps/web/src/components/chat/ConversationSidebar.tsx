'use client';

import { useState } from 'react';
import type { ConversationSummary } from '@klarify/ai/chat/useKlarifyChat';
import { Plus, Trash } from '@/components/icons';

interface Props {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

/**
 * Format an updatedAt timestamp as a relative label ("2m ago", "3d ago",
 * or "Mar 14"). Falls back to ISO date for older items.
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 7 * 86_400) return `${Math.floor(diffSec / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: Props): JSX.Element {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <aside className="flex h-full w-80 flex-col border-r border-[#E5E5E5] bg-[#FAFAFA]">
      <div className="border-b border-[#E5E5E5] p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B6E6E] px-3 py-2 text-sm font-medium text-white hover:bg-[#0a5a5a]"
        >
          <Plus />
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#999]">
            Your conversations will appear here. Ask Klarify your first regulatory question.
          </div>
        ) : (
          <ul className="p-2">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              const isConfirming = confirmDeleteId === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={[
                      'group relative block w-full rounded-lg px-3 py-2 text-left transition-colors',
                      isActive
                        ? 'bg-[#E6F4F4] text-[#0B6E6E]'
                        : 'text-[#1A1A1A] hover:bg-[#F0F0F0]',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={[
                            'truncate text-sm font-medium',
                            isActive ? 'text-[#0B6E6E]' : 'text-[#1A1A1A]',
                          ].join(' ')}
                        >
                          {c.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#777]">
                          {relativeTime(c.updatedAt)} · {c.messageCount}{' '}
                          {c.messageCount === 1 ? 'msg' : 'msgs'}
                        </p>
                      </div>
                      {isConfirming ? (
                        <span className="flex items-center gap-1 text-xs">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(c.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded bg-[#C0392B] px-1.5 py-0.5 text-[10px] font-medium text-white"
                          >
                            Delete
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="rounded border border-[#CCCCCC] bg-white px-1.5 py-0.5 text-[10px] text-[#555]"
                          >
                            Cancel
                          </span>
                        </span>
                      ) : (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Delete conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(c.id);
                          }}
                          className="opacity-0 transition-opacity hover:text-[#C0392B] group-hover:opacity-100"
                        >
                          <Trash />
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
