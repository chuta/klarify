'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';
import {
  WHITE_PAPER_LICENCE_CATEGORIES,
  WHITE_PAPER_SOURCE_JURISDICTIONS,
  type WhitePaperLicenceCategory,
  type WhitePaperSourceJurisdiction,
} from '@klarify/core';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
const MAX_BYTES = 10 * 1024 * 1024;

type TabMode = 'upload' | 'paste' | 'recent';

export interface RecentWhitePaper {
  id: string;
  originalFilename: string | null;
  status: string;
  completenessPct: number | null;
  uploadedAt: string;
  sourceJurisdiction: string;
  licenceCategorySought: string;
}

const SOURCE_LABELS: Record<WhitePaperSourceJurisdiction, string> = {
  GH: 'Ghana',
  KE: 'Kenya',
  MU: 'Mauritius',
  ZA: 'South Africa',
  OTHER: 'Other',
};

export function WhitePaperUploader({
  apiBaseUrl,
  recentAnalyses,
}: {
  apiBaseUrl: string;
  recentAnalyses: RecentWhitePaper[];
}): JSX.Element {
  const router = useRouter();
  const [mode, setMode] = useState<TabMode>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState('');
  const [sourceJurisdiction, setSourceJurisdiction] = useState<WhitePaperSourceJurisdiction>('GH');
  const [licenceCategory, setLicenceCategory] = useState<WhitePaperLicenceCategory>('DAX');
  const [existingLicence, setExistingLicence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const baseUrl = apiBaseUrl.replace(/\/$/, '');

  const submitFile = useCallback(
    async (f: File): Promise<void> => {
      setError(null);
      if (!validateFile(f, setError)) return;
      setSubmitting(true);
      try {
        const supabase = createClient();
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) throw new Error('You must be signed in.');

        const form = new FormData();
        form.append('file', f);
        form.append('sourceJurisdiction', sourceJurisdiction);
        form.append('licenceCategorySought', licenceCategory);
        if (existingLicence.trim()) form.append('existingSourceLicence', existingLicence.trim());

        const res = await fetch(`${baseUrl}/api/documents/whitepaper/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const body = (await res.json()) as
          | { success: true; data: { analysisId: string } }
          | { success: false; error: string };
        if (!body.success) throw new Error(body.error);
        router.push(`/dashboard/compliance/documents/analyzer/${body.data.analysisId}`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    },
    [baseUrl, router, sourceJurisdiction, licenceCategory, existingLicence],
  );

  const submitPaste = useCallback(async (): Promise<void> => {
    setError(null);
    if (pasted.trim().length < 1000) {
      setError('Please paste at least 1,000 characters of the white paper.');
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in.');

      const res = await fetch(`${baseUrl}/api/documents/whitepaper/analyse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: pasted,
          sourceJurisdiction,
          licenceCategorySought: licenceCategory,
          existingSourceLicence: existingLicence.trim() || undefined,
        }),
      });
      const body = (await res.json()) as
        | { success: true; data: { analysisId: string } }
        | { success: false; error: string };
      if (!body.success) throw new Error(body.error);
      router.push(`/dashboard/compliance/documents/analyzer/${body.data.analysisId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [baseUrl, pasted, router, sourceJurisdiction, licenceCategory, existingLicence]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#1A1A1A]">Source jurisdiction</span>
          <select
            value={sourceJurisdiction}
            onChange={(e): void =>
              setSourceJurisdiction(e.target.value as WhitePaperSourceJurisdiction)
            }
            className="w-full rounded-md border border-[#CCC] px-3 py-2 text-sm"
          >
            {WHITE_PAPER_SOURCE_JURISDICTIONS.map((j) => (
              <option key={j} value={j}>
                {SOURCE_LABELS[j]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#1A1A1A]">
            Licence category sought (Nigeria)
          </span>
          <select
            value={licenceCategory}
            onChange={(e): void =>
              setLicenceCategory(e.target.value as WhitePaperLicenceCategory)
            }
            className="w-full rounded-md border border-[#CCC] px-3 py-2 text-sm"
          >
            {WHITE_PAPER_LICENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-[#555]">
            Existing licence in source market (optional)
          </span>
          <input
            type="text"
            value={existingLicence}
            onChange={(e): void => setExistingLicence(e.target.value)}
            placeholder="e.g. Ghana VASP Act 2025 — Digital Asset Exchange"
            className="w-full rounded-md border border-[#CCC] px-3 py-2 text-sm"
            maxLength={500}
          />
        </label>
      </div>

      <div role="tablist" className="inline-flex rounded-lg bg-[#F5F5F5] p-1">
        {[
          { id: 'upload', label: 'Upload file' },
          { id: 'paste', label: 'Paste text' },
          { id: 'recent', label: `Recent (${recentAnalyses.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={(): void => setMode(tab.id as TabMode)}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition',
              mode === tab.id
                ? 'bg-white text-[#0B6E6E] shadow-sm'
                : 'text-[#555] hover:text-[#1A1A1A]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'upload' && (
        <div
          onDragOver={(e): void => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(): void => setDragging(false)}
          onDrop={(e): void => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) {
              setFile(dropped);
              void submitFile(dropped);
            }
          }}
          className={[
            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-8 text-center transition',
            dragging ? 'border-[#0B6E6E] bg-[#E6F4F4]' : 'border-[#CCCCCC] hover:border-[#0B6E6E]',
          ].join(' ')}
        >
          <DocumentTextIcon className="h-10 w-10 text-[#0B6E6E]" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-[#1A1A1A]">
            Drop your white paper here
          </p>
          <p className="mt-1 text-xs text-[#777]">
            PDF, JPG, PNG or WEBP. Maximum 10 MB. Stored encrypted, never shared.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
            className="hidden"
            onChange={(e): void => {
              const chosen = e.target.files?.[0];
              if (chosen) {
                setFile(chosen);
                void submitFile(chosen);
              }
            }}
          />
          <button
            type="button"
            disabled={submitting}
            onClick={(): void => fileInputRef.current?.click()}
            className="mt-4 rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5a5a] disabled:opacity-40"
          >
            {submitting ? 'Uploading…' : 'Browse files'}
          </button>
          {file && !submitting ? (
            <p className="mt-3 text-xs text-[#0B6E6E]">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          ) : null}
        </div>
      )}

      {mode === 'paste' && (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <label htmlFor="wp-paste" className="block text-sm font-semibold text-[#1A1A1A]">
            Paste your white paper text
          </label>
          <textarea
            id="wp-paste"
            value={pasted}
            onChange={(e): void => setPasted(e.target.value)}
            rows={10}
            placeholder="Paste the full text of your existing white paper here…"
            className="mt-3 block w-full resize-y rounded-lg border border-[#CCCCCC] p-3 text-sm"
            disabled={submitting}
          />
          <p className="mt-2 text-xs text-[#777]">
            {pasted.length.toLocaleString()} characters (1,000 minimum)
          </p>
          <button
            type="button"
            disabled={submitting || pasted.trim().length < 1000}
            onClick={(): void => void submitPaste()}
            className="mt-3 rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? 'Analysing…' : 'Analyse white paper'}
          </button>
        </div>
      )}

      {mode === 'recent' && (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
          {recentAnalyses.length === 0 ? (
            <p className="p-6 text-center text-sm text-[#777]">
              No white paper analyses yet. Upload or paste your first white paper above.
            </p>
          ) : (
            <ul className="divide-y divide-[#F0F0F0]">
              {recentAnalyses.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/dashboard/compliance/documents/analyzer/${doc.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#FAFAFA]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {doc.originalFilename ?? 'White paper analysis'}
                      </p>
                      <p className="text-xs text-[#777]">
                        {SOURCE_LABELS[doc.sourceJurisdiction as WhitePaperSourceJurisdiction] ??
                          doc.sourceJurisdiction}{' '}
                        → {doc.licenceCategorySought}
                      </p>
                    </div>
                    <div className="text-right text-xs text-[#555]">
                      {doc.completenessPct != null ? `${doc.completenessPct}% complete` : doc.status}
                      <br />
                      {new Date(doc.uploadedAt).toLocaleDateString('en-NG')}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error ? <p className="text-sm text-[#C0392B]">{error}</p> : null}
    </div>
  );
}

function validateFile(f: File, setError: (m: string) => void): boolean {
  if (
    !ALLOWED_TYPES.includes(f.type) &&
    !ALLOWED_EXT.some((e) => f.name.toLowerCase().endsWith(`.${e}`))
  ) {
    setError('Please upload a PDF or image (JPG, PNG, WEBP).');
    return false;
  }
  if (f.size > MAX_BYTES) {
    setError('File is too large. Maximum size is 10 MB.');
    return false;
  }
  return true;
}
