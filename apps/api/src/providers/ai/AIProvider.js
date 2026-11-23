// The contract every AI provider adapter implements. Feature code never talks to a provider directly:
// it goes through AIService, which adds validation, timeouts, retries, metering and error mapping.
//
// Every method receives validated input and `{ signal }` (aborted on timeout) and returns:
//   { data, usage: { inputTokens, outputTokens }, model }
// `data` must match the schema for that operation in modules/ai/ai.schemas.js.
// Adapters must not log or store prompts, code or responses.

export const OPERATIONS = [
  'generateProjectPlan',
  'generateProjectCode',
  'explainCode',
  'refineProject',
  'answerTeacherQuestion',
  'debugError',
];

export class AIProvider {
  /** Short stable id, e.g. "mock", "openai". */
  name = 'abstract';
  /** True only for providers that return canned sample output. Surfaced to the UI. */
  isMock = false;

  async generateProjectPlan() {
    throw new Error(`${this.name} does not implement generateProjectPlan`);
  }

  async generateProjectCode() {
    throw new Error(`${this.name} does not implement generateProjectCode`);
  }

  async explainCode() {
    throw new Error(`${this.name} does not implement explainCode`);
  }

  async refineProject() {
    throw new Error(`${this.name} does not implement refineProject`);
  }

  async answerTeacherQuestion() {
    throw new Error(`${this.name} does not implement answerTeacherQuestion`);
  }

  async debugError() {
    throw new Error(`${this.name} does not implement debugError`);
  }
}
