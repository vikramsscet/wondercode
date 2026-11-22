import { useCallback, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../../services/apiClient.js';
import { MAX_ANSWERS, PROMPT_MAX } from './promptStudioData.js';

const friendlyError = (err) => {
  if (err instanceof ApiError && err.status === 429) {
    return 'You have asked for a lot of ideas! Please wait a little and try again.';
  }
  if (err instanceof ApiError && err.status === 401) {
    return 'Your visit has ended. Please start again from the home page.';
  }
  return "We couldn't make a plan just now. Please try again.";
};

const saveError = (err) => {
  if (err instanceof ApiError && err.status === 409 && err.message) return err.message; // project limits
  if (err instanceof ApiError && err.status === 429) return friendlyError(err);
  if (err instanceof ApiError && err.status === 401) return friendlyError(err);
  return "We couldn't build your project just now. Please try again.";
};

// Steps: writing -> thinking -> clarifying | blocked | reviewing | error.
// The prompt lives only in memory: nothing about it is written to browser storage.
export function usePromptStudio({
  childId,
  guestToken,
  defaultLanguage = 'en',
  initialPrompt = '',
}) {
  const [state, setState] = useState({
    step: 'writing',
    prompt: initialPrompt.slice(0, PROMPT_MAX),
    language: defaultLanguage,
    answers: [],
    questions: [],
    message: '',
    plan: null,
    isMock: false,
    notice: '',
    saved: null,
    failed: 'plan', // which action to repeat on Try again
  });
  const latest = useRef(0); // ignores replies that arrive after a newer request

  const run = useCallback(
    async (prompt, language, answers) => {
      const id = ++latest.current;
      setState((s) => ({ ...s, step: 'thinking', prompt, language, answers, notice: '' }));
      try {
        const data = await apiRequest('/prompts/plan', {
          method: 'POST',
          body: { prompt, language, ...(answers.length > 0 && { answers }) },
          childId,
          guestToken,
        });
        if (id !== latest.current) return;
        if (data.status === 'ok') {
          setState((s) => ({ ...s, step: 'reviewing', plan: data.plan, isMock: data.isMock }));
        } else if (data.status === 'blocked') {
          setState((s) => ({ ...s, step: 'blocked', message: data.message }));
        } else if (answers.length >= MAX_ANSWERS) {
          setState((s) => ({
            ...s,
            step: 'writing',
            answers: [],
            notice: 'Add a few more details to your idea, then try again.',
          }));
        } else {
          setState((s) => ({
            ...s,
            step: 'clarifying',
            questions: data.questions,
            message: data.message ?? '',
          }));
        }
      } catch (err) {
        if (id !== latest.current) return;
        setState((s) => ({ ...s, step: 'error', message: friendlyError(err), failed: 'plan' }));
      }
    },
    [childId, guestToken],
  );

  const generate = useCallback(
    async (plan, prompt, language) => {
      const id = ++latest.current;
      setState((s) => ({ ...s, step: 'saving' }));
      try {
        const data = await apiRequest('/projects/generate', {
          method: 'POST',
          body: { plan, ...(prompt && { prompt }), language },
          childId,
          guestToken,
        });
        if (id !== latest.current) return;
        setState((s) => ({ ...s, step: 'saved', saved: data, isMock: data.isMock ?? s.isMock }));
      } catch (err) {
        if (id !== latest.current) return;
        setState((s) => ({ ...s, step: 'error', message: saveError(err), failed: 'generate' }));
      }
    },
    [childId, guestToken],
  );

  return {
    ...state,
    generate: () => generate(state.plan, state.prompt, state.language),
    setPrompt: (prompt) => setState((s) => ({ ...s, prompt })),
    setLanguage: (language) => setState((s) => ({ ...s, language })),
    submit: () => run(state.prompt, state.language, []),
    answer: (text) => run(state.prompt, state.language, [...state.answers, text]),
    retry: () =>
      state.failed === 'generate'
        ? generate(state.plan, state.prompt, state.language)
        : run(state.prompt, state.language, state.answers),
    edit: () => {
      latest.current += 1;
      setState((s) => ({ ...s, step: 'writing', answers: [], plan: null, notice: '' }));
    },
  };
}
