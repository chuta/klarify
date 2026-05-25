// Public API for @klarify/email.

export {
  sendEmail,
  type SendEmailInput,
  type SendEmailResult,
} from './client.js';

export { emailConfig, COMPANY, type EmailConfig } from './config.js';
export { renderEmail, type RenderedEmail } from './render.js';

// Components (mostly for advanced custom emails).
export * from './components/index.js';

// All transactional templates + their subject helpers.
export * from './templates/index.js';

// Typed send helpers — preferred entry point for callers.
export * from './send-helpers.js';

// Lifecycle drip sequence definitions (for API cron workers).
export * from './drips/registry.js';
