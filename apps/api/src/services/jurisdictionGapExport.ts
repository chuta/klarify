// =============================================================================
// Jurisdiction gap analysis Word export (US-004, Sprint 6)
// =============================================================================
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type {
  JurisdictionGapResult,
  JurisdictionGapRow,
  JurisdictionGapStatus,
} from '@klarify/core';
import { JURISDICTION_GAP_DISCLAIMER } from '@klarify/core';
import { prisma, withRls } from '../db.js';
import { getSignedDownloadUrl, putObject } from './s3.js';

export interface JurisdictionGapExportResult {
  downloadUrl: string;
  expiresAt: string;
  s3Key: string;
}

const STATUS_LABEL: Record<JurisdictionGapStatus, string> = {
  green: 'Already satisfied',
  amber: 'Needs adjustment',
  red: 'Action required',
};

function statusCounts(rows: readonly JurisdictionGapRow[]): {
  green: number;
  amber: number;
  red: number;
} {
  let green = 0;
  let amber = 0;
  let red = 0;
  for (const row of rows) {
    if (row.status === 'green') green += 1;
    else if (row.status === 'amber') amber += 1;
    else red += 1;
  }
  return { green, amber, red };
}

function cell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20 })],
      }),
    ],
  });
}

export async function exportJurisdictionGapDocx(
  analysisId: string,
  userId: string,
): Promise<JurisdictionGapExportResult> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true, org: { select: { name: true } } },
  });
  if (!membership) {
    throw new Error('Organisation not found.');
  }

  const row = await withRls({ userId, orgId: membership.orgId }, (tx) =>
    tx.jurisdictionGapAnalysis.findFirst({
      where: { id: analysisId, orgId: membership.orgId },
    }),
  );
  if (!row) {
    throw new Error('Analysis not found.');
  }

  const result = row.result as unknown as JurisdictionGapResult;
  const counts = statusCounts(result.dimensions);
  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        cell('Dimension', true),
        cell('Current state', true),
        cell('Target requirement', true),
        cell('Status', true),
        cell('How to close', true),
      ],
    }),
    ...result.dimensions.map(
      (dim) =>
        new TableRow({
          children: [
            cell(dim.dimension.replace(/_/g, ' ')),
            cell(dim.current_state),
            cell(dim.target_requirement),
            cell(STATUS_LABEL[dim.status]),
            cell(dim.how_to_close || '—'),
          ],
        }),
    ),
  ];

  const contactParagraphs = result.regulator_contacts.flatMap((contact) => [
    new Paragraph({
      children: [
        new TextRun({
          text: `${contact.jurisdiction} — ${contact.name}`,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${contact.website} · ${contact.email}` }),
      ],
    }),
  ]);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: membership.org.name,
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Jurisdiction Expansion Gap Analysis',
                bold: true,
                size: 32,
              }),
            ],
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [new TextRun({ text: `Report date: ${reportDate}`, italics: true })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Source: ${result.source_jurisdiction} → Targets: ${result.target_jurisdictions.join(', ')}`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Executive summary: ${counts.green} gaps already satisfied · ${counts.amber} need adjustment · ${counts.red} action required`,
                bold: true,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Gap analysis', bold: true, size: 26 })],
            heading: HeadingLevel.HEADING_1,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Regulator contacts', bold: true, size: 26 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360 },
          }),
          ...contactParagraphs,
          new Paragraph({
            children: [
              new TextRun({
                text: JURISDICTION_GAP_DISCLAIMER,
                italics: true,
                size: 18,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 480 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Generated by Klarify Africa — klarify.africa',
                italics: true,
                size: 16,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const buffer = Buffer.from(await Packer.toBuffer(doc));
  const s3Key = `${membership.orgId}/${userId}/jurisdiction-gap/${randomUUID()}_gap_report.docx`;
  await putObject({
    key: s3Key,
    body: buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    downloadFilename: 'jurisdiction_gap_report.docx',
  });

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const downloadUrl = await getSignedDownloadUrl(s3Key, 3600);

  return { downloadUrl, expiresAt, s3Key };
}
