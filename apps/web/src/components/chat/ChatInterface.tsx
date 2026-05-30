'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useKlarifyChat } from '@klarify/ai/chat/useKlarifyChat';
import { messageSuggestsEscalation } from '@klarify/core';
import { createClient } from '@/lib/supabase/client';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { ConversationSidebar } from './ConversationSidebar';
import {
  SpecialistRequestModal,
  type SpecialistRequestDefaults,
} from '@/components/specialists/SpecialistRequestModal';
import { ChatBubbleLeftRightIcon, Lock, MenuIcon, Plus } from '@/components/icons';
import { track } from '@/lib/analytics/events';

const STARTER_QUESTIONS: string[] = [
  'What licences does my product need in Nigeria?',
  'How do I start the SEC Nigeria ARIP process?',
  'I received a letter from SEC Nigeria — what do I do?',
  'What does ISA 2025 mean for my business?',
];

interface ChatInterfaceProps {
  hasSpecialistAccess: boolean;
  currentPlan: string;
  userName: string;
  userEmail: string;
  orgName: string;
}

export function ChatInterface({
  hasSpecialistAccess,
  currentPlan,
  userName,
  userEmail,
  orgName,
}: ChatInterfaceProps): JSX.Element {
  // Memoised auth token getter — the hook calls this on every API call so
  // tokens always come from the live Supabase session, not a stale closure.
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const {
    messages,
    conversationId,
    conversations,
    isStreaming,
    error,
    quota,
    sendMessage,
    stopStreaming,
    newConversation,
    loadConversation,
    deleteConversation,
  } = useKlarifyChat({ getAuthToken });

  const handleSend = useCallback(
    (text: string) => {
      track('ai_query_made', {
        surface: 'chat',
        remaining:
          quota && quota.limit !== null ? Math.max(quota.limit - quota.used, 0) : undefined,
      });
      void sendMessage(text);
    },
    [quota, sendMessage],
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [specialistModalOpen, setSpecialistModalOpen] = useState(false);
  const [specialistDefaults, setSpecialistDefaults] = useState<
    SpecialistRequestDefaults | undefined
  >();

  const openSpecialistRequest = useCallback(
    (defaults?: SpecialistRequestDefaults) => {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      setSpecialistDefaults({
        source: 'chat',
        topic: defaults?.topic ?? 'general',
        urgency: defaults?.urgency ?? 'standard',
        ...defaults,
        context: {
          orgName,
          conversationId: conversationId ?? undefined,
          lastUserMessage: lastUser?.content.slice(0, 500),
          ...defaults?.context,
        },
      });
      setSpecialistModalOpen(true);
    },
    [conversationId, messages, orgName],
  );

  // Auto-scroll to bottom on new message / token arrival.
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const emptyState = messages.length === 0;
  const quotaBlocked =
    quota !== null && quota.limit !== null && quota.used >= quota.limit;

  useEffect(() => {
    if (quotaBlocked) {
      track('paywall_hit', {
        feature: 'ai_queries',
        required_plan: (quota?.plan ?? 'free') === 'free' ? 'navigator' : 'compass',
      });
    }
  }, [quotaBlocked, quota?.plan]);

  const quotaBlockedMessage = quotaBlocked
    ? `You have used all ${quota?.limit} AI queries this month on the ${quota?.plan} plan. ` +
      `Upgrade to keep asking Klarify.`
    : null;

  return (
    <div className="flex h-[calc(100dvh-var(--klarify-dashboard-chrome,4rem))] overflow-hidden bg-white">
      {/* Sidebar — desktop (lg+) static, mobile (<lg) slides in over a backdrop */}
      <div className="hidden lg:block">
        <ConversationSidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={(id) => {
            void loadConversation(id);
          }}
          onNew={newConversation}
          onDelete={(id) => {
            void deleteConversation(id);
          }}
        />
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="relative z-50">
            <ConversationSidebar
              conversations={conversations}
              activeId={conversationId}
              onSelect={(id) => {
                void loadConversation(id);
                setSidebarOpen(false);
              }}
              onNew={() => {
                newConversation();
                setSidebarOpen(false);
              }}
              onDelete={(id) => {
                void deleteConversation(id);
              }}
            />
          </div>
        </div>
      )}

      {/* Chat column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Header (mobile only — desktop relies on dashboard chrome) */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded p-1.5 text-[#555] hover:bg-[#F5F5F5]"
            aria-label="Open conversations"
          >
            <MenuIcon size="md" />
          </button>
          <span className="text-sm font-semibold text-[#1A1A1A]">FounderCounsel</span>
          <button
            type="button"
            onClick={newConversation}
            className="rounded p-1.5 text-[#555] hover:bg-[#F5F5F5]"
            aria-label="New conversation"
          >
            <Plus size="md" />
          </button>
        </div>

        {/* Scrollable message area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {emptyState ? (
            <EmptyState onPick={handleSend} />
          ) : (
            <div className="flex w-full flex-col gap-4">
              {messages.map((m) => (
                <div key={m.id}>
                  <MessageBubble
                    role={m.role}
                    content={m.content}
                    citations={m.citations}
                    streaming={m.streaming}
                    errored={m.errored}
                  />
                  {m.role === 'assistant' &&
                  !m.streaming &&
                  messageSuggestsEscalation(m.content) ? (
                    <div className="mt-2 rounded-xl border border-[#0B6E6E]/40 bg-[#E6F4F4] px-4 py-3">
                      <p className="text-xs text-[#0D2B45]">
                        This question may need a qualified practitioner. Request a warm introduction
                        through Klarify&apos;s vetted network.
                      </p>
                      {hasSpecialistAccess ? (
                        <button
                          type="button"
                          onClick={() => openSpecialistRequest()}
                          className="mt-2 text-xs font-semibold text-[#0B6E6E] underline hover:text-[#0A5F5F]"
                        >
                          Talk to a vetted specialist →
                        </button>
                      ) : (
                        <Link
                          href="/dashboard/billing?plan=compass"
                          className="mt-2 inline-block text-xs font-semibold text-[#0B6E6E] underline"
                        >
                          Available on Compass — upgrade →
                        </Link>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
              <div ref={scrollAnchorRef} />
            </div>
          )}
        </div>

        {/* Persistent disclaimer + input */}
        <div className="border-t border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 sm:px-8">
          <div className="w-full space-y-2">
            {/* CLAUDE.md §16 Rule 1 — never remove this banner */}
            <p className="text-[11px] text-[#777]">
              Klarify provides regulatory information, not legal advice. Always verify with a
              qualified practitioner.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => openSpecialistRequest()}
                className="text-[11px] font-semibold text-[#0B6E6E] hover:underline"
              >
                Talk to a vetted specialist →
              </button>
              {!hasSpecialistAccess ? (
                <span className="text-[10px] text-[#999]">Compass+</span>
              ) : null}
            </div>

            {error && !quotaBlocked && (
              <div className="rounded-lg border border-[#C0392B]/40 bg-[#FCEAE8] px-3 py-2 text-xs text-[#7a1f15]">
                {error}
              </div>
            )}

            {quotaBlocked ? (
              <QueryLimitUpgradePrompt plan={quota?.plan ?? 'free'} limit={quota?.limit ?? 0} />
            ) : (
              <ChatInput
                onSend={handleSend}
                onStop={stopStreaming}
                isStreaming={isStreaming}
                blockedMessage={null}
              />
            )}

            {quota && quota.limit !== null && !quotaBlocked && (
              <p
                className={[
                  'text-[11px]',
                  quota.used >= quota.limit * 0.8 ? 'text-[#D4A843]' : 'text-[#777]',
                ].join(' ')}
              >
                {quota.used} of {quota.limit} queries used this month on the {quota.plan} plan.
              </p>
            )}
          </div>
        </div>
      </div>

      <SpecialistRequestModal
        open={specialistModalOpen}
        onClose={() => setSpecialistModalOpen(false)}
        hasAccess={hasSpecialistAccess}
        currentPlan={currentPlan}
        defaultName={userName}
        defaultEmail={userEmail}
        defaultCompany={orgName}
        defaults={specialistDefaults}
      />
    </div>
  );
}

function QueryLimitUpgradePrompt({
  plan,
  limit,
}: {
  plan: string;
  limit: number;
}): JSX.Element {
  const requiredPlan = plan === 'free' ? 'navigator' : 'compass';
  const planLabel = requiredPlan === 'navigator' ? 'Navigator' : 'Compass';

  return (
    <div className="rounded-xl border border-[#0B6E6E] bg-[#E6F4F4] p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B6E6E] text-white">
          <Lock className="h-4 w-4 text-white" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0D2B45]">
            Monthly query limit reached
          </p>
          <p className="text-xs text-[#555]">
            You have used all {limit} AI queries this month on the {plan} plan.
            Upgrade to keep asking Klarify.
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-white p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#0B6E6E]">
          {planLabel} includes:
        </p>
        {requiredPlan === 'navigator' ? (
          <ul className="space-y-1 text-xs text-[#555]">
            <li>✓ 50 AI queries / month</li>
            <li>✓ 5 document analyses</li>
            <li>✓ 3 compliance document templates</li>
          </ul>
        ) : (
          <ul className="space-y-1 text-xs text-[#555]">
            <li>✓ Unlimited AI queries</li>
            <li>✓ ARIP tracker + Regulator CRM</li>
            <li>✓ All 13 document templates</li>
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3">
        <a
          href={`/dashboard/billing?plan=${requiredPlan}`}
          onClick={() =>
            track('upgrade_clicked', { from_plan: plan, to_plan: requiredPlan })
          }
          className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A5F5F]"
        >
          Upgrade to {planLabel} →
        </a>
        <a
          href="/pricing"
          className="text-xs text-[#0B6E6E] underline hover:text-[#0A5F5F]"
        >
          See all plans
        </a>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }): JSX.Element {
  return (
    <div className="flex w-full flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F4F4]">
        <ChatBubbleLeftRightIcon className="h-7 w-7 text-[#0B6E6E]" strokeWidth={1.6} aria-hidden />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-[#1A1A1A]">
        Navigate Regulated Markets with Confidence
      </h2>
      <p className="mb-8 max-w-lg text-sm text-[#555]">
        Ask Klarify any question about Nigerian or African digital asset regulation in plain
        English. Every answer is grounded in the source: ISA 2025, SEC Digital Asset Rules,
        MLPPA 2022, NFIU Guidelines, FATF standards, and The Founder&apos;s Guide.
      </p>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {STARTER_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-xl border border-[#CCCCCC] bg-white p-3 text-left text-sm text-[#1A1A1A] shadow-sm transition-colors hover:border-[#0B6E6E] hover:bg-[#E6F4F4]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
