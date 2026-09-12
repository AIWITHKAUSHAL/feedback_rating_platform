/**
 * Centralised Axios client.
 *
 * Everything HTTP related lives here: base URL, timeout, the admin bearer
 * token and the translation of backend error envelopes into a single typed
 * error class. Components never call axios directly and never hard-code a URL.
 */
import axios, { AxiosError, type AxiosInstance } from "axios";

import type { FieldError } from "../types";

/**
 * Empty by default so requests are relative:
 *  - dev: Vite proxies /api to the local FastAPI container
 *  - prod: CloudFront routes /api/* to the ALB (same origin, no CORS)
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const TOKEN_STORAGE_KEY = "coursepulse.admin.token";
const REQUEST_TIMEOUT_MS = 15_000;

/** Shape of the backend error envelope. */
interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: FieldError[] };
  request_id?: string;
}

/** A normalised API failure that UI code can render directly. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors: FieldError[];
  readonly requestId?: string;

  constructor(
    message: string,
    options: { code: string; status: number; fieldErrors?: FieldError[]; requestId?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.fieldErrors = options.fieldErrors ?? [];
    this.requestId = options.requestId;
  }

  get isDuplicateReview(): boolean {
    return this.code === "DUPLICATE_REVIEW";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

// ---------------------------------------------------------------- token store
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Private browsing modes can throw on storage access.
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* ignore - the session simply will not survive a reload */
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Fired when the API rejects a token so the app can return to the login page. */
export const UNAUTHORIZED_EVENT = "coursepulse:unauthorized";

// -------------------------------------------------------------------- client
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function toApiError(error: AxiosError<ErrorEnvelope>): ApiError {
  if (error.response) {
    const { status, data } = error.response;
    const envelope = data?.error;
    return new ApiError(envelope?.message ?? "The request could not be completed.", {
      code: envelope?.code ?? "HTTP_ERROR",
      status,
      fieldErrors: envelope?.details,
      requestId: data?.request_id,
    });
  }
  if (error.code === "ECONNABORTED") {
    return new ApiError("The request timed out. Please check your connection and try again.", {
      code: "TIMEOUT",
      status: 0,
    });
  }
  return new ApiError("Could not reach the CoursePulse API. Please try again.", {
    code: "NETWORK_ERROR",
    status: 0,
  });
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorEnvelope>) => {
    const apiError = toApiError(error);
    if (apiError.isUnauthorized) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(apiError);
  },
);

/** Narrow an unknown caught value to an ApiError with a usable message. */
export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError("Something went wrong. Please try again.", {
    code: "UNKNOWN",
    status: 0,
  });
}
