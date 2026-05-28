'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
const MAX_BYTES = 10 * 1024 * 1024;

type Mode = 'upload' | 'paste';

interface RecentDoc {
  id: string;
  filename: string;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  uploadedAt: string;
  status: string;
}

/**
 * Three-tab document uploader (CLAUDE.md S3-B2).
 *
 *  Upload tab  → drag-and-drop + browse button
 *  Paste tab   → textarea (min 100 chars)
 *  Recent tab  → list of the user's prior analyses
 *
 * On submit, navigates to /dashboard/documents/[id] where the processing
 * stepper + results live.
 */
export function DocumentUploader({
  apiBaseUrl,
  recentDocs,
}: {
  apiBaseUrl: string;
  recentDocs: RecentDoc[];
}): JSX.Element {
  const router = useRouter();
  const [mode, setMode] = useState<'upload' | 'paste' | 'recent'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState('');
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
        if (!token) throw new Error('You must be signed in to upload a document.');

        const form = new FormData();
        form.append('file', f);

        const res = await fetch(`${baseUrl}/api/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const body = (await res.json()) as
          | { success: true; data: { documentId: string } }
          | { success: false; error: string };
        if (!body.success) throw new Error(body.error);
        router.push(`/dashboard/documents/${body.data.documentId}`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    },
    [baseUrl, router],
  );

  const submitPaste = useCallback(
    async (text: string): Promise<void> => {
      setError(null);
      if (text.trim().length < 100) {
        setError('Please paste at least 100 characters of the document text.');
        return;
      }
      setSubmitting(true);
      try {
        const supabase = createClient();
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) throw new Error('You must be signed in to upload a document.');

        const res = await fetch(`${baseUrl}/api/documents/analyse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        });
        const body = (await res.json()) as
          | { success: true; data: { documentId: string } }
          | { success: false; error: string };
        if (!body.success) throw new Error(body.error);
        router.push(`/dashboard/documents/${body.data.documentId}`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    },
    [baseUrl, router],
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div role="tablist" className="inline-flex rounded-lg bg-[#F5F5F5] p-1">
        {[
          { id: 'upload', label: 'Upload file' },
          { id: 'paste', label: 'Paste text' },
          { id: 'recent', label: `Recent (${recentDocs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => setMode(tab.id as Mode | 'recent')}
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

      {/* Upload tab */}
      {mode === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
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
            dragging
              ? 'border-[#0B6E6E] bg-[#E6F4F4]'
              : 'border-[#CCCCCC] hover:border-[#0B6E6E]',
          ].join(' ')}
        >
          <DocumentTextIcon className="h-10 w-10 text-[#0B6E6E]" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-[#1A1A1A]">
            Drop your regulatory document here
          </p>
          <p className="mt-1 text-xs text-[#777]">
            PDF, JPG, PNG or WEBP. Maximum 10 MB. Stored encrypted, never shared.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
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
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5a5a] disabled:opacity-40"
          >
            {submitting ? 'Uploading…' : 'Browse files'}
          </button>
          {file && !submitting && (
            <p className="mt-3 text-xs text-[#0B6E6E]">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>
      )}

      {/* Paste tab */}
      {mode === 'paste' && (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <label
            htmlFor="paste-text"
            className="block text-sm font-semibold text-[#1A1A1A]"
          >
            Paste the regulatory letter text
          </label>
          <p className="mt-1 text-xs text-[#777]">
            If you have the document as searchable text, pasting is faster than uploading.
            Klarify will skip OCR and go straight to analysis.
          </p>
          <textarea
            id="paste-text"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={10}
            placeholder="Paste the full text of the regulator's letter here. Include the date, subject line, and signatory if visible."
            className="mt-3 block w-full resize-y rounded-lg border border-[#CCCCCC] bg-white p-3 text-sm leading-relaxed text-[#1A1A1A] placeholder:text-[#999] focus:border-[#0B6E6E] focus:outline-none"
            disabled={submitting}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#777]">
            <span>{pasted.length} characters (100 minimum)</span>
          </div>
          <button
            type="button"
            disabled={submitting || pasted.trim().length < 100}
            onClick={() => void submitPaste(pasted)}
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5a5a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Analysing…' : 'Analyse this document'}
          </button>
        </div>
      )}

      {/* Recent tab */}
      {mode === 'recent' && (
        <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
          {recentDocs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[#555]">No documents yet.</p>
              <p className="mt-1 text-xs text-[#999]">
                Upload one above to see your action plan within 30 seconds.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F5F5F5]">
              {recentDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#FAFAFA]"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/documents/${doc.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <DocumentTextIcon className="h-5 w-5 shrink-0 text-[#0B6E6E]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1A1A1A]">
                        {doc.filename}
                      </p>
                      <p className="text-[11px] text-[#777]">
                        {relativeTime(doc.uploadedAt)} ·{' '}
                        <span className="capitalize">{doc.status.replace('_', ' ')}</span>
                      </p>
                    </div>
                  </button>
                  {doc.urgencyLevel && (
                    <UrgencyPill level={doc.urgencyLevel} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#C0392B]/40 bg-[#FCEAE8] px-4 py-3 text-sm text-[#7a1f15]">
          {error}
        </div>
      )}
    </div>
  );
}

function UrgencyPill({
  level,
}: {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}): JSX.Element {
  const styles: Record<typeof level, string> = {
    CRITICAL: 'bg-[#C0392B] text-white',
    HIGH: 'bg-[#D4A843] text-[#1A1A1A]',
    MEDIUM: 'bg-[#0D2B45] text-white',
    LOW: 'bg-[#1A7A4A] text-white',
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[level]}`}
    >
      {level}
    </span>
  );
}

function validateFile(
  file: File,
  setError: (msg: string) => void,
): boolean {
  if (file.size === 0) {
    setError('The file is empty.');
    return false;
  }
  if (file.size > MAX_BYTES) {
    setError('File is too large. Maximum size is 10 MB.');
    return false;
  }
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
    setError('Klarify analyses PDF documents or images (JPG, PNG, WEBP).');
    return false;
  }
  return true;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
  if (diffSec < 86_400) return `${Math.round(diffSec / 3600)} h ago`;
  if (diffSec < 604_800) return `${Math.round(diffSec / 86_400)} d ago`;
  return new Date(iso).toLocaleDateString();
}
