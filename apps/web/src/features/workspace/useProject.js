import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from '../../services/apiClient.js';

// Loads a saved project (current version, hash-checked by the API). status:
// loading | ready | notfound | error. Call reload() to try again.
export function useProject(projectId, { childId, guestToken }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null });
  const key = `${projectId}|${childId ?? ''}|${guestToken ?? ''}|${attempt}`;

  useEffect(() => {
    let live = true;
    apiRequest(`/projects/${encodeURIComponent(projectId)}`, { childId, guestToken })
      .then((data) => live && setResult({ key, status: 'ready', data }))
      .catch((err) => {
        const status =
          err instanceof ApiError && [400, 404].includes(err.status) ? 'notfound' : 'error';
        if (live) setResult({ key, status });
      });
    return () => {
      live = false;
    };
  }, [key, projectId, childId, guestToken]);

  const current = result.key === key ? result : { status: 'loading' };
  return { status: current.status, project: current.data, reload: () => setAttempt((n) => n + 1) };
}
