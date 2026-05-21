export {
  extractCitations,
  resolveCitationUrl,
  REGULATION_URLS,
  type Citation,
} from './citations.js';
export { streamChat, parseFrame, type StreamEvent } from './streaming.js';
export {
  classifyAnthropicError,
  extractUpstreamSignals,
  type AnthropicErrorCategory,
  type ClassifiedAnthropicError,
} from './anthropicErrors.js';
// Note: useKlarifyChat is exported lazily from a sub-path so non-React
// consumers (apps/api) don't pull React types through the barrel.
// Web/mobile import as: import { useKlarifyChat } from '@klarify/ai/chat/useKlarifyChat'
