'use client';

/**
 * SponsoredIndividualForm — Sprint 5 S5-E1.
 *
 * The SPONSORED_INDIVIDUAL template requires at least 4 individual profiles.
 * Each profile maps to a separate "Sponsored Individual" sheet inside the
 * generated Word document.
 *
 * Lifecycle is the same as DocumentGeneratorForm (Idle → Submitting →
 * Generated) but the input is a dynamic array of person objects.
 */
import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role =
  | 'Managing Director'
  | 'Compliance Officer'
  | 'Director'
  | 'Controller'
  | 'Other';

interface Individual {
  id: string;
  full_name: string;
  role: Role;
  nin: string;
  bvn: string;
  responsibilities: string;
  experience_and_track_record: string;
  criminal_convictions_declaration: boolean;
  sanctions_declaration: boolean;
  professional_conduct_declaration: boolean;
}

interface GeneratedDoc {
  documentId: string;
  downloadUrls: { docx: string; pdf: string };
  version: number;
}

interface SponsoredIndividualFormProps {
  apiBaseUrl: string;
  companyName: string;
  previousVersion: number | null;
  tinyApiKey: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_INDIVIDUALS = 4;

function createBlankIndividual(): Individual {
  return {
    id: crypto.randomUUID(),
    full_name: '',
    role: 'Director',
    nin: '',
    bvn: '',
    responsibilities: '',
    experience_and_track_record: '',
    criminal_convictions_declaration: false,
    sanctions_declaration: false,
    professional_conduct_declaration: false,
  };
}

// ---------------------------------------------------------------------------
// Sub-component: single person card
// ---------------------------------------------------------------------------

interface PersonCardProps {
  person: Individual;
  index: number;
  onUpdate: (id: string, field: keyof Individual, value: string | boolean) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function PersonCard({ person, index, onUpdate, onRemove, canRemove }: PersonCardProps): JSX.Element {
  const ROLES: Role[] = [
    'Managing Director',
    'Compliance Officer',
    'Director',
    'Controller',
    'Other',
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Card header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#0D2B45]">
          Individual {index + 1}
          {person.full_name ? ` — ${person.full_name}` : ''}
        </h3>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(person.id)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Full name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Full legal name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={person.full_name}
            onChange={(e) => onUpdate(person.id, 'full_name', e.target.value)}
            placeholder="As it appears on NIN"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none focus:ring-1 focus:ring-[#0B6E6E]"
          />
        </div>

        {/* Role */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Role / Title <span className="text-red-500">*</span>
          </label>
          <select
            value={person.role}
            onChange={(e) => onUpdate(person.id, 'role', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none focus:ring-1 focus:ring-[#0B6E6E]"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* NIN */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            NIN (National Identification Number) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={person.nin}
            onChange={(e) => onUpdate(person.id, 'nin', e.target.value)}
            placeholder="11-digit NIN"
            maxLength={11}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#0B6E6E] focus:outline-none focus:ring-1 focus:ring-[#0B6E6E]"
          />
        </div>

        {/* BVN */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            BVN (Bank Verification Number) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={person.bvn}
            onChange={(e) => onUpdate(person.id, 'bvn', e.target.value)}
            placeholder="11-digit BVN"
            maxLength={11}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#0B6E6E] focus:outline-none focus:ring-1 focus:ring-[#0B6E6E]"
          />
        </div>
      </div>

      {/* Responsibilities */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Responsibilities at the firm <span className="text-red-500">*</span>
        </label>
        <textarea
          value={person.responsibilities}
          onChange={(e) => onUpdate(person.id, 'responsibilities', e.target.value)}
          rows={3}
          placeholder="Describe their specific responsibilities and decision-making authority"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none focus:ring-1 focus:ring-[#0B6E6E]"
        />
      </div>

      {/* Experience */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Experience and track record <span className="text-red-500">*</span>
        </label>
        <textarea
          value={person.experience_and_track_record}
          onChange={(e) => onUpdate(person.id, 'experience_and_track_record', e.target.value)}
          rows={3}
          placeholder="Relevant industry experience, prior roles, qualifications"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none focus:ring-1 focus:ring-[#0B6E6E]"
        />
      </div>

      {/* Declarations */}
      <div className="mt-4 rounded-md bg-gray-50 p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">
          Statutory declarations (Section 18i, ARIP Framework) —{' '}
          <span className="text-[#0B6E6E]">check to confirm</span>
        </p>
        {(
          [
            {
              field: 'criminal_convictions_declaration' as const,
              label: 'No criminal convictions (domestic or foreign)',
            },
            {
              field: 'sanctions_declaration' as const,
              label: 'Not subject to any sanctions (UN, OFAC, EU, or domestic)',
            },
            {
              field: 'professional_conduct_declaration' as const,
              label:
                'No adverse finding by any professional or regulatory body',
            },
          ] as Array<{ field: 'criminal_convictions_declaration' | 'sanctions_declaration' | 'professional_conduct_declaration'; label: string }>
        ).map(({ field, label }) => (
          <label key={field} className="mb-2 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={person[field]}
              onChange={(e) => onUpdate(person.id, field, e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0B6E6E] focus:ring-[#0B6E6E]"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SponsoredIndividualForm({
  apiBaseUrl,
  companyName,
  previousVersion,
}: SponsoredIndividualFormProps): JSX.Element {
  const [individuals, setIndividuals] = useState<Individual[]>(() =>
    Array.from({ length: MIN_INDIVIDUALS }, createBlankIndividual),
  );
  const [status, setStatus] = useState<'idle' | 'submitting' | 'generated'>('idle');
  const [generated, setGenerated] = useState<GeneratedDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  const handleUpdate = useCallback(
    (id: string, field: keyof Individual, value: string | boolean) => {
      setIndividuals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
      );
    },
    [],
  );

  const handleRemove = useCallback((id: string) => {
    setIndividuals((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleAdd = useCallback(() => {
    setIndividuals((prev) => [...prev, createBlankIndividual()]);
  }, []);

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    setError(null);

    // --- Validation ---
    if (individuals.length < MIN_INDIVIDUALS) {
      setValidationError(
        `At least ${MIN_INDIVIDUALS} sponsored individuals are required (Section 18i, ARIP Framework). Please add ${MIN_INDIVIDUALS - individuals.length} more.`,
      );
      return;
    }

    const firstIncomplete = individuals.find(
      (p) =>
        !p.full_name.trim() ||
        !p.nin.trim() ||
        !p.bvn.trim() ||
        !p.responsibilities.trim() ||
        !p.experience_and_track_record.trim(),
    );
    if (firstIncomplete) {
      setValidationError('All required fields must be filled for every individual.');
      return;
    }

    setStatus('submitting');

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(`${apiBaseUrl}/api/documents/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          templateId: 'SPONSORED_INDIVIDUAL',
          formData: {
            company_name: companyName,
            individuals: individuals.map(({ id: _id, ...rest }) => rest),
          },
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const envelope = (await res.json()) as {
        success: boolean;
        data: GeneratedDoc;
      };
      if (!envelope.success) throw new Error('Generation failed');

      setGenerated(envelope.data);
      setStatus('generated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('idle');
    }
  }, [individuals, apiBaseUrl, companyName]);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  const isSubmitting = status === 'submitting';
  const progressLabel =
    individuals.length >= MIN_INDIVIDUALS
      ? `${individuals.length} individuals added ✓`
      : `${individuals.length} of ${MIN_INDIVIDUALS} minimum individuals added`;
  const progressColour =
    individuals.length >= MIN_INDIVIDUALS ? 'text-[#1A7A4A]' : 'text-[#D4A843]';

  return (
    <div className="w-full min-w-0">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D2B45]">
          Sponsored Individual Profiles
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Section 18i, ARIP Framework — SEC Nigeria, June 2024
        </p>
        {companyName && (
          <p className="mt-0.5 text-sm text-gray-500">
            For <span className="font-medium">{companyName}</span>
          </p>
        )}
      </div>

      {/* Regulatory note */}
      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Regulatory requirement:</strong> A minimum of 4 sponsored
        individual profiles are required under Section 18i of the ARIP
        Framework. Each profile must include the individual&rsquo;s NIN, BVN,
        responsibilities, and statutory declarations.
      </div>

      {/* Progress indicator */}
      <div className={`mb-4 text-sm font-medium ${progressColour}`}>
        {progressLabel}
      </div>

      {/* Individual cards */}
      <div className="space-y-4">
        {individuals.map((person, index) => (
          <PersonCard
            key={person.id}
            person={person}
            index={index}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            canRemove={individuals.length > 1}
          />
        ))}
      </div>

      {/* Add individual button */}
      {individuals.length < 10 && (
        <button
          type="button"
          onClick={handleAdd}
          className="mt-4 flex items-center gap-1 rounded-md border border-dashed border-[#0B6E6E] px-4 py-2 text-sm text-[#0B6E6E] hover:bg-[#E6F4F4]"
        >
          + Add another individual
        </button>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError}
        </div>
      )}

      {/* API error */}
      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Previous version note */}
      {previousVersion !== null && (
        <p className="mt-4 text-xs text-gray-500">
          Generating will create version {previousVersion + 1}. Previous
          versions are saved in document history.
        </p>
      )}

      {/* Generate button */}
      {status !== 'generated' && (
        <button
          type="button"
          onClick={() => { void handleSubmit(); }}
          disabled={isSubmitting}
          className="mt-6 w-full rounded-md bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0a5f5f] disabled:opacity-60"
        >
          {isSubmitting
            ? 'Generating profiles… this takes about 20 seconds'
            : 'Generate Sponsored Individual Profiles'}
        </button>
      )}

      {/* Generated state */}
      {status === 'generated' && generated && (
        <div className="mt-6 rounded-lg border border-[#0B6E6E] bg-[#E6F4F4] p-6">
          <h2 className="mb-3 text-base font-semibold text-[#0B6E6E]">
            Profiles generated — version {generated.version}
          </h2>
          <p className="mb-4 text-sm text-gray-700">
            Review and customise before submission to SEC Nigeria.
          </p>
          <div className="flex gap-3">
            <a
              href={generated.downloadUrls.docx}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-[#0B6E6E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a5f5f]"
            >
              Download .docx
            </a>
            <a
              href={generated.downloadUrls.pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[#0B6E6E] px-4 py-2 text-sm font-medium text-[#0B6E6E] hover:bg-white"
            >
              Download PDF
            </a>
          </div>

          {/* Disclaimer */}
          <p className="mt-4 text-xs text-gray-500">
            This document was generated with AI assistance. Review with a
            qualified Nigerian digital asset regulatory specialist before
            submission to SEC Nigeria. Klarify provides regulatory information,
            not legal advice.
          </p>

          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setGenerated(null);
            }}
            className="mt-4 text-sm text-[#0B6E6E] underline"
          >
            Regenerate with changes
          </button>
        </div>
      )}
    </div>
  );
}
