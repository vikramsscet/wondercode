// Thrown by provider adapters. `retryable` tells the AIService whether another attempt may help
// (network failures, 429/5xx from a vendor) or not (bad request, auth problem).
export class AIProviderError extends Error {
  constructor(message, { retryable = false, cause } = {}) {
    super(message);
    this.name = 'AIProviderError';
    this.retryable = retryable;
    if (cause) this.cause = cause;
  }
}
