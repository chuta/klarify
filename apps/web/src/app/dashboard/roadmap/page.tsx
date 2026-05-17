import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { TaskCard } from './_TaskCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoadmapTask {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  regulatoryBasis: string | null;
  templateId: string | null;
  indicatorKey: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

interface RoadmapData {
  tasks: RoadmapTask[];
  grouped: Record<string, RoadmapTask[]>;
  orgId: string | null;
}

// ── Phase metadata ────────────────────────────────────────────────────────────

const PHASES = [
  {
    phase: 1,
    title: 'Phase 1 — Foundation',
    subtitle: 'Corporate structure & capital',
    color: '#0B6E6E',
    bg: '#E6F4F4',
  },
  {
    phase: 2,
    title: 'Phase 2 — AML / KYC',
    subtitle: 'Compliance infrastructure',
    color: '#0D2B45',
    bg: '#E8EEF4',
  },
  {
    phase: 3,
    title: 'Phase 3 — Regulatory Engagement',
    subtitle: 'ARIP application & regulator relations',
    color: '#D4A843',
    bg: '#FDF6E3',
  },
  {
    phase: 4,
    title: 'Phase 4 — Full Registration',
    subtitle: 'AIP operations & licence completion',
    color: '#1A7A4A',
    bg: '#F0FAF5',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RoadmapPage(): Promise<JSX.Element> {
  const supabase = createClient();
  await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/sign-in');

  const accessToken = session.access_token;

  const [roadmapResult, scoreResult] = await Promise.all([
    apiFetch<RoadmapData>('/api/compliance/roadmap', accessToken),
    apiFetch<{ totalScore: number }>('/api/compliance/score', accessToken),
  ]);

  const tasks = roadmapResult.success ? roadmapResult.data.tasks : [];
  const totalScore = scoreResult.success ? scoreResult.data.totalScore : 0;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'complete').length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Group tasks by phase (fill missing phases with empty array).
  const grouped: Record<number, RoadmapTask[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const task of tasks) {
    const p = task.phase as 1 | 2 | 3 | 4;
    if (grouped[p]) grouped[p]!.push(task);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Compliance Roadmap</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Complete each task to raise your Regulatory Readiness Score. Tasks marked
          <span className="mx-1 inline-flex items-center rounded bg-[#E6F4F4] px-1.5 py-0.5 text-[10px] font-semibold text-[#0B6E6E]">Updates score</span>
          recalculate your score in real time when ticked.
        </p>
      </div>

      {/* Progress summary bar */}
      <div className="mb-8 rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">Readiness Score</p>
              <p className="text-3xl font-bold text-[#0B6E6E]">{totalScore}<span className="ml-1 text-sm font-normal text-[#CCCCCC]">/ 100</span></p>
            </div>
            <div className="h-12 w-px bg-[#F5F5F5]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">Tasks</p>
              <p className="text-3xl font-bold text-[#1A1A1A]">
                {completedTasks}<span className="text-lg font-normal text-[#CCCCCC]">/{totalTasks}</span>
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-xs">
            <div className="mb-1.5 flex justify-between text-xs text-[#555555]">
              <span>Overall progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F5F5F5]">
              <div
                className="h-full rounded-full bg-[#0B6E6E] transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* No tasks yet */}
      {totalTasks === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[#CCCCCC] p-12 text-center">
          <p className="text-sm text-[#555555]">No roadmap tasks yet.</p>
          <p className="mt-1 text-xs text-[#CCCCCC]">
            Complete the{' '}
            <Link href="/dashboard/onboarding" className="text-[#0B6E6E] underline underline-offset-2">
              setup wizard
            </Link>{' '}
            to generate your personalised roadmap.
          </p>
        </div>
      )}

      {/* 4-phase sections */}
      {totalTasks > 0 && (
        <div className="space-y-8">
          {PHASES.map(({ phase, title, subtitle, color, bg }) => {
            const phaseTasks = grouped[phase] ?? [];
            const phaseComplete = phaseTasks.filter((t) => t.status === 'complete').length;
            const phaseTotal = phaseTasks.length;
            const phasePct = phaseTotal > 0 ? Math.round((phaseComplete / phaseTotal) * 100) : 0;

            // Phases with no tasks are collapsed by default.
            if (phaseTotal === 0) return null;

            return (
              <section key={phase}>
                {/* Phase header */}
                <div
                  className="mb-4 flex items-center justify-between rounded-xl px-5 py-4"
                  style={{ backgroundColor: bg }}
                >
                  <div>
                    <h2 className="text-sm font-bold" style={{ color }}>{title}</h2>
                    <p className="text-xs text-[#555555]">{subtitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {phaseComplete}/{phaseTotal}
                    </span>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-white/60">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${phasePct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </div>

                {/* Task grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {phaseTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      description={task.description ?? ''}
                      regulatoryBasis={task.regulatoryBasis}
                      templateId={task.templateId}
                      indicatorKey={task.indicatorKey}
                      status={task.status}
                      phase={task.phase}
                      accessToken={accessToken}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
