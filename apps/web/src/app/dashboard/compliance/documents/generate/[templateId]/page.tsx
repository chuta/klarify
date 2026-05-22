import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma, resolveOrgId } from '@/lib/db';
import {
  getTemplate,
  type DocumentField,
} from '@klarify/ai/prompts/documents';
import { getPublicApiBaseUrl } from '@/lib/env';
import { DocumentGeneratorForm } from '@/components/documents/DocumentGeneratorForm';
import { SponsoredIndividualForm } from '@/components/documents/SponsoredIndividualForm';

interface PageProps {
  params: { templateId: string };
  searchParams: { from?: string; taskId?: string };
}

/**
 * /dashboard/compliance/documents/generate/[templateId] — form + preview.
 *
 * Server component:
 *   1. Gates on auth.
 *   2. Resolves the template — 404 on unknown id.
 *   3. Builds the prefill payload from the org + user + profile.
 *   4. Renders the client form with pre-filled values + roadmap deep-link
 *      context (read from `?from=roadmap&taskId=…`).
 */
export default async function GenerateDocumentPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  const template = getTemplate(params.templateId);
  if (!template) notFound();

  const orgId = await resolveOrgId(user.id);
  const prefill = await buildPrefillValues(user.id, orgId, template.requiredFields);

  // Latest existing generation — used so the form can show "v3 about to
  // become v4" hint and pre-fill from prior form data.
  const existing = orgId
    ? await prisma.generatedDocument.findFirst({
        where: {
          orgId,
          templateType: template.templateId,
          isCurrent: true,
          deletedAt: null,
        },
        select: { id: true, version: true, formData: true },
      })
    : null;

  // Merge pre-fill: existing formData → org defaults → server-side today fallback.
  const initialValues: Record<string, unknown> = { ...prefill };
  if (existing?.formData) {
    Object.assign(initialValues, existing.formData as Record<string, unknown>);
  }

  // Deep-link context for "Mark roadmap task complete" CTA.
  const roadmapTaskId =
    searchParams.from === 'roadmap' && typeof searchParams.taskId === 'string'
      ? searchParams.taskId
      : null;

  // SPONSORED_INDIVIDUAL uses a special multi-person form (Sprint 5 S5-E1).
  if (template.templateId === 'SPONSORED_INDIVIDUAL') {
    return (
      <SponsoredIndividualForm
        apiBaseUrl={getPublicApiBaseUrl()}
        companyName={(initialValues.company_name as string | undefined) ?? ''}
        previousVersion={existing?.version ?? null}
        tinyApiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY ?? ''}
      />
    );
  }

  return (
    <DocumentGeneratorForm
      apiBaseUrl={getPublicApiBaseUrl()}
      template={{
        templateId: template.templateId,
        documentName: template.documentName,
        regulatoryBasis: template.regulatoryBasis,
        category: template.category,
        requiredFields: template.requiredFields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          helpText: f.helpText,
          options: (f.options ?? null) as string[] | null,
          prefilledFrom: f.prefilledFrom ?? null,
          itemFields: f.itemFields
            ? f.itemFields.map((sf) => ({
                key: sf.key,
                label: sf.label,
                type: sf.type,
                required: sf.required,
                helpText: sf.helpText,
                options: (sf.options ?? null) as string[] | null,
              }))
            : null,
          minItems: f.minItems ?? null,
        })),
      }}
      initialValues={initialValues}
      previousVersion={existing?.version ?? null}
      roadmapTaskId={roadmapTaskId}
      tinyApiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY ?? ''}
    />
  );
}

async function buildPrefillValues(
  userId: string,
  orgId: string | null,
  fields: readonly DocumentField[],
): Promise<Record<string, unknown>> {
  const org = orgId
    ? await prisma.organisation.findUnique({
        where: { id: orgId },
        select: { name: true, plan: true },
      })
    : null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      productTypes: true,
      targetMarkets: true,
      stage: true,
      teamSize: true,
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const ctx: Record<string, unknown> = {
    org: {
      name: org?.name ?? '',
      plan: org?.plan ?? 'free',
    },
    user: {
      name: user?.name ?? '',
      email: user?.email ?? '',
    },
    profile: {
      productTypes: profile?.productTypes ?? [],
      targetMarkets: profile?.targetMarkets ?? [],
      stage: profile?.stage ?? null,
      teamSize: profile?.teamSize ?? null,
    },
    today,
  };

  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!f.prefilledFrom) continue;
    const v = resolvePath(f.prefilledFrom, ctx);
    if (v !== undefined && v !== null && v !== '') {
      out[f.key] = v;
    }
  }
  return out;
}

function resolvePath(path: string, ctx: Record<string, unknown>): unknown {
  const segs = path.split('.');
  let cur: unknown = ctx;
  for (const s of segs) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[s];
  }
  return cur;
}
