'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  SPECIALIST_TOPIC_LABELS,
  VETTED_SPECIALISTS,
  type SpecialistProfile,
  type SpecialistTopic,
} from '@klarify/core';
import {
  SpecialistRequestModal,
  type SpecialistRequestDefaults,
} from '@/components/specialists/SpecialistRequestModal';

interface SpecialistsClientProps {
  hasAccess: boolean;
  currentPlan: string;
  userName: string;
  userEmail: string;
  orgName: string;
}

export function SpecialistsClient({
  hasAccess,
  currentPlan,
  userName,
  userEmail,
  orgName,
}: SpecialistsClientProps): JSX.Element {
  const [topicFilter, setTopicFilter] = useState<SpecialistTopic | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaults, setModalDefaults] = useState<SpecialistRequestDefaults | undefined>();

  const filtered = useMemo(() => {
    if (topicFilter === 'all') return [...VETTED_SPECIALISTS];
    return VETTED_SPECIALISTS.filter((s) => s.specialties.includes(topicFilter));
  }, [topicFilter]);

  function openRequest(specialist?: SpecialistProfile): void {
    setModalDefaults({
      source: 'directory',
      preferredSpecialistId: specialist?.id,
      preferredSpecialistName: specialist?.name,
      topic: specialist?.specialties[0] ?? 'general',
      context: { orgName },
    });
    setModalOpen(true);
  }

  return (
    <div>
      <div className="mb-6 rounded-xl border border-[#0B6E6E]/30 bg-[#E6F4F4] px-4 py-3 text-sm text-[#0D2B45]">
        <strong>How it works:</strong> Browse vetted practitioners below. Request an introduction. The
        Klarify team matches you and sends a warm intro by email. Direct contact details are not listed;
        all requests are routed to our team for personal handling.
      </div>

      {!hasAccess ? (
        <div className="mb-8 rounded-2xl border border-[#0B6E6E] bg-white p-6">
          <p className="mb-2 text-sm font-semibold text-[#0D2B45]">Compass plan required</p>
          <p className="mb-4 text-sm text-[#555555]">
            Human escalation connects you with lawyers and compliance professionals vetted for Nigerian
            digital asset regulation. Included on Compass and Flagship.
          </p>
          <Link
            href="/dashboard/billing?plan=compass"
            className="inline-block rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A5F5F]"
          >
            Upgrade to Compass →
          </Link>
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-[#555555]">Filter by topic</label>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value as SpecialistTopic | 'all')}
            className="rounded-lg border border-[#CCCCCC] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B6E6E]"
          >
            <option value="all">All specialists</option>
            {(Object.entries(SPECIALIST_TOPIC_LABELS) as [SpecialistTopic, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
          <button
            type="button"
            onClick={() => openRequest()}
            className="ml-auto rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A5F5F]"
          >
            Request introduction (any topic)
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((specialist) => (
          <SpecialistCard
            key={specialist.id}
            specialist={specialist}
            hasAccess={hasAccess}
            onRequest={() => openRequest(specialist)}
          />
        ))}
      </div>

      <p className="mt-8 text-xs text-[#999]">
        Specialists are vetted against Klarify network criteria (PRD Appendix B). Listings are updated
        by the Klarify team — not user-generated.
      </p>

      <SpecialistRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        hasAccess={hasAccess}
        currentPlan={currentPlan}
        defaultName={userName}
        defaultEmail={userEmail}
        defaultCompany={orgName}
        defaults={modalDefaults}
      />
    </div>
  );
}

function SpecialistCard({
  specialist,
  hasAccess,
  onRequest,
}: {
  specialist: SpecialistProfile;
  hasAccess: boolean;
  onRequest: () => void;
}): JSX.Element {
  return (
    <div className="relative flex flex-col rounded-2xl border border-[#CCCCCC] bg-white p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#1A1A1A]">{specialist.name}</p>
          <p className="text-xs text-[#555555]">{specialist.firm}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#EFF7F2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1A7A4A]">
          Verified
        </span>
      </div>

      <p className="mb-3 flex-1 text-sm leading-relaxed text-[#555555]">{specialist.bio}</p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {specialist.specialties.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#E6F4F4] px-2 py-0.5 text-[10px] font-medium text-[#0B6E6E]"
          >
            {SPECIALIST_TOPIC_LABELS[tag]}
          </span>
        ))}
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-2 text-xs text-[#555555]">
        <div>
          <dt className="font-medium text-[#1A1A1A]">Typical response</dt>
          <dd>{specialist.typicalResponse}</dd>
        </div>
        <div>
          <dt className="font-medium text-[#1A1A1A]">Consult fee range</dt>
          <dd>{specialist.feeRange}</dd>
        </div>
        <div>
          <dt className="font-medium text-[#1A1A1A]">Markets</dt>
          <dd>{specialist.jurisdictions.join(', ')}</dd>
        </div>
        <div>
          <dt className="font-medium text-[#1A1A1A]">Languages</dt>
          <dd>{specialist.languages.join(', ')}</dd>
        </div>
      </dl>

      {hasAccess ? (
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-lg border border-[#0B6E6E] py-2 text-sm font-semibold text-[#0B6E6E] hover:bg-[#E6F4F4]"
        >
          Request introduction →
        </button>
      ) : (
        <div className="rounded-lg border border-dashed border-[#CCCCCC] py-2 text-center text-xs text-[#999]">
          Compass+ required
        </div>
      )}
    </div>
  );
}
