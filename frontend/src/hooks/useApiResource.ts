/**
 * Small data-loading hook used by every screen.
 *
 * It gives each page the four states the UI has to handle - loading, error,
 * empty and success - without repeating try/catch plumbing in components.
 *
 * `loading` is *derived* by comparing the key of the request that produced the
 * current result with the key of the request the component wants now. That
 * keeps the effect free of synchronous state updates and means a stale
 * response can never be painted after the inputs change.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { asApiError, type ApiError } from "../api/client";

export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  /** Re-run the request (used after a mutation, or by "Try again" buttons). */
  reload: () => void;
}

interface Result<T> {
  key: string;
  data: T | null;
  error: ApiError | null;
}

const NO_RESULT: Result<never> = { key: "", data: null, error: null };

export function useApiResource<T>(fetcher: () => Promise<T>, deps: unknown[]): ApiResource<T> {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<Result<T>>(NO_RESULT);

  // Identity of the request the caller wants right now. `deps` are query
  // parameters (numbers, strings, booleans), so serialising them is both cheap
  // and stable across renders.
  const requestKey = `${reloadToken}:${JSON.stringify(deps)}`;

  // Latest-ref pattern: lets callers pass an inline arrow function without it
  // becoming an effect dependency.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let active = true;

    fetcherRef
      .current()
      .then((data) => {
        if (active) setResult({ key: requestKey, data, error: null });
      })
      .catch((caught: unknown) => {
        if (active) setResult({ key: requestKey, data: null, error: asApiError(caught) });
      });

    return () => {
      // Ignore a response that arrives after the inputs changed or the
      // component unmounted.
      active = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const settled = result.key === requestKey;
  return {
    data: settled ? result.data : null,
    loading: !settled,
    error: settled ? result.error : null,
    reload,
  };
}
