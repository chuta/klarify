// US-008B — White paper gap report + outline Word export.
import { randomUUID } from 'node:crypto';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { WhitePaperAnalysisResult } from '@klarify/core';
import { WHITE_PAPER_DISCLAIMER } from '@klarify/core';
import { prisma, withRls } from '../db.js';
import { getSignedDownloadUrl, putObject } from './s3.js';

export interface WhitePaperExportResult {
  downloadUrl: string;
  expiresAt: string;
  s3Key: string;
}

const STATUS_LABEL: Record<string, string> = {
  adequate: 'Adequate',
  partial: 'Partial',
  missing: 'Missing',
  not_applicable: 'N/A',
};

export async function exportWhitePaperGapReportDocx(
  analysisId: string,
  userId: string,
): Promise<WhitePaperExportResult> {
  const { orgId, orgName, result } = await loadAnalysis(analysisId, userId);
  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: orgName, bold: true, size: 28 })],
    }),
    new Paragraph({ children: [new TextRun({ text: reportDate, size: 20 })] }),
    new Paragraph({
      text: 'White Paper Gap Analysis — SEC Nigeria ARIP Requirements',
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Source: ${result.source_jurisdiction} → Nigeria (${result.licence_category_sought})`,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Completeness: ${result.sections_adequate_count}/${result.sections_total} sections adequate (${result.completeness_pct}%)`,
          bold: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ children: [new TextRun({ text: result.executive_summary, size: 22 })] }),
    new Paragraph({ text: 'Critical Gaps', heading: HeadingLevel.HEADING_2 }),
    ...result.critical_gaps.flatMap((gap) => [
      new Paragraph({
        children: [
          new TextRun({ text: `${gap.rank}. ${gap.title}`, bold: true, size: 22 }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: gap.gap_description, size: 20 })] }),
      new Paragraph({
        children: [new TextRun({ text: `Remediation: ${gap.remediation}`, italics: true, size: 20 })],
      }),
    ]),
    new Paragraph({ text: 'Section Assessment', heading: HeadingLevel.HEADING_2 }),
    ...result.section_assessments.flatMap((s) => [
      new Paragraph({
        children: [
          new TextRun({
            text: `${s.section_name} — ${STATUS_LABEL[s.status] ?? s.status}`,
            bold: true,
            size: 22,
          }),
        ],
      }),
      ...(s.gap_summary
        ? [new Paragraph({ children: [new TextRun({ text: s.gap_summary, size: 20 })] })]
        : []),
    ]),
    new Paragraph({ text: 'Source Jurisdiction Notes', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({
      children: [new TextRun({ text: result.source_jurisdiction_notes.comparative_notes, size: 20 })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: WHITE_PAPER_DISCLAIMER,
          italics: true,
          size: 18,
          color: '666666',
        }),
      ],
      spacing: { before: 400 },
    }),
  ];

  return uploadDocx(orgId, userId, analysisId, 'gap_report', children);
}

export async function exportWhitePaperOutlineDocx(
  analysisId: string,
  userId: string,
): Promise<WhitePaperExportResult> {
  const { orgId, orgName, result } = await loadAnalysis(analysisId, userId);
  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: orgName, bold: true, size: 28 })],
    }),
    new Paragraph({ children: [new TextRun({ text: reportDate, size: 20 })] }),
    new Paragraph({
      text: 'ARIP White Paper Outline (Draft)',
      heading: HeadingLevel.HEADING_1,
    }),
    ...result.draft_outline.sections.flatMap((sec) => [
      new Paragraph({
        text: `${sec.number}. ${sec.title}`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        children: [new TextRun({ text: sec.guidance, size: 20 })],
      }),
      ...(sec.suggested_content
        ? [
            new Paragraph({
              children: [
                new TextRun({ text: sec.suggested_content, italics: true, size: 20 }),
              ],
            }),
          ]
        : []),
      ...(sec.regulatory_basis
        ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Basis: ${sec.regulatory_basis}`,
                  size: 18,
                  color: '0B6E6E',
                }),
              ],
            }),
          ]
        : []),
    ]),
    new Paragraph({
      children: [
        new TextRun({
          text:
            'Under Section 16 of the ARIP Framework, this application MUST be filed through a registered solicitor or adviser.',
          bold: true,
          size: 20,
        }),
      ],
      spacing: { before: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: WHITE_PAPER_DISCLAIMER,
          italics: true,
          size: 18,
          color: '666666',
        }),
      ],
      spacing: { before: 400 },
    }),
  ];

  return uploadDocx(orgId, userId, analysisId, 'outline', children);
}

async function loadAnalysis(
  analysisId: string,
  userId: string,
): Promise<{ orgId: string; orgName: string; result: WhitePaperAnalysisResult }> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true, org: { select: { name: true } } },
  });
  if (!membership) throw new Error('Organisation not found.');

  const row = await withRls({ userId, orgId: membership.orgId }, (tx) =>
    tx.whitePaperAnalysis.findFirst({
      where: { id: analysisId, orgId: membership.orgId, deletedAt: null },
    }),
  );
  if (!row || !row.result || row.status !== 'complete') {
    throw new Error('Analysis not found or not complete.');
  }

  return {
    orgId: membership.orgId,
    orgName: membership.org.name,
    result: row.result as unknown as WhitePaperAnalysisResult,
  };
}

async function uploadDocx(
  orgId: string,
  userId: string,
  analysisId: string,
  kind: string,
  children: Paragraph[],
): Promise<WhitePaperExportResult> {
  const doc = new Document({
    sections: [{ children, properties: {} }],
  });
  const buffer = await Packer.toBuffer(doc);
  const s3Key = `${orgId}/${userId}/whitepaper/${analysisId}_${kind}_${randomUUID()}.docx`;
  await putObject({
    key: s3Key,
    body: buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    downloadFilename: `white_paper_${kind}.docx`,
  });
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const downloadUrl = await getSignedDownloadUrl(s3Key, 3600);
  return { downloadUrl, expiresAt, s3Key };
}
