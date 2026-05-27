// US-008B — In-process analysis queue for white paper uploads.
import { extractWhitePaperText, WhitePaperOcrError } from './whitePaperOcr.js';
import { analyseWhitePaper, WhitePaperAnalysisError } from './whitePaperAnalysis.js';

const inFlight = new Set<string>();

export function enqueueWhitePaperAnalysis(analysisId: string): Promise<void> {
  if (inFlight.has(analysisId)) {
    return Promise.resolve();
  }
  inFlight.add(analysisId);
  return runPipeline(analysisId).finally(() => {
    inFlight.delete(analysisId);
  });
}

async function runPipeline(analysisId: string): Promise<void> {
  try {
    await extractWhitePaperText(analysisId);
  } catch (err) {
    if (err instanceof WhitePaperOcrError) {
      console.warn('[whitePaperQueue] OCR failed for %s: %s', analysisId, err.message);
    } else {
      console.error('[whitePaperQueue] OCR threw for %s', analysisId, err);
    }
    return;
  }

  try {
    await analyseWhitePaper(analysisId);
  } catch (err) {
    if (err instanceof WhitePaperAnalysisError) {
      console.warn('[whitePaperQueue] analysis failed for %s: %s', analysisId, err.message);
    } else {
      console.error('[whitePaperQueue] analysis threw for %s', analysisId, err);
    }
  }
}
