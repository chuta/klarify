'use client';

import { useState } from 'react';

interface CustomTaskFormProps {
  defaultPhase: 1 | 2 | 3 | 4;
  onCreate: (input: {
    title: string;
    description?: string;
    phase: 1 | 2 | 3 | 4;
    dueDate?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function CustomTaskForm({ defaultPhase, onCreate, onCancel }: CustomTaskFormProps): JSX.Element {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(defaultPhase);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        phase,
        dueDate: dueDate || undefined,
      });
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => { void handleSubmit(e); }}
      className="rounded-xl border border-[#0B6E6E] bg-white p-4 shadow-md"
      data-testid="custom-task-form"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#0B6E6E]">
        Add a custom task
      </p>
      <div className="grid gap-3">
        <label className="text-xs font-semibold text-[#555555]">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            required
            minLength={3}
            maxLength={200}
            className="mt-1 w-full rounded-md border border-[#CCCCCC] px-2 py-1 text-sm text-[#1A1A1A]"
            data-testid="custom-task-title"
          />
        </label>
        <label className="text-xs font-semibold text-[#555555]">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context, links, sub-steps…"
            rows={3}
            className="mt-1 w-full rounded-md border border-[#CCCCCC] px-2 py-1 text-xs text-[#1A1A1A]"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[#555555]">
            Phase
            <select
              value={phase}
              onChange={(e) => setPhase(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className="mt-1 w-full rounded-md border border-[#CCCCCC] bg-white px-2 py-1 text-xs text-[#1A1A1A]"
            >
              <option value={1}>Phase 1</option>
              <option value={2}>Phase 2</option>
              <option value={3}>Phase 3</option>
              <option value={4}>Phase 4</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#555555]">
            Due date (optional)
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#CCCCCC] px-2 py-1 text-xs text-[#1A1A1A]"
            />
          </label>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-[#C0392B]">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[#CCCCCC] px-3 py-1.5 text-xs font-semibold text-[#555555] hover:border-[#0B6E6E]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[#0B6E6E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a5b5b] disabled:opacity-60"
          data-testid="custom-task-submit"
        >
          {submitting ? 'Adding…' : 'Add task'}
        </button>
      </div>
    </form>
  );
}
