import { MockAIProvider } from './mock/MockAIProvider.js';

// Adding a real provider = write an adapter extending AIProvider, then add one line here.
// Nothing else in the application changes. Reserved names without an adapter fail fast at startup.
const factories = {
  mock: () => new MockAIProvider(),
  // openai: (config) => new OpenAIProvider(config.ai),
  // gemini: (config) => new GeminiProvider(config.ai),
  // anthropic: (config) => new AnthropicProvider(config.ai),
};

export function createAIProvider(config, available = factories) {
  const factory = available[config.ai.provider];
  if (!factory) {
    throw new Error(
      `AI provider "${config.ai.provider}" is not implemented yet. Use AI_PROVIDER=mock for now.`,
    );
  }
  return factory(config);
}
