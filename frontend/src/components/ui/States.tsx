/**
 * Empty and error states.
 *
 * Every screen that loads data uses these, so a user never meets a blank page
 * and an error always offers a way forward.
 */
import type { ReactNode } from "react";

import { Button } from "./Button";

interface StateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: StateProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl"
        aria-hidden="true"
      >
        🔍
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate-600">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div
      className="card flex flex-col items-center gap-3 border-rose-200 px-6 py-14 text-center"
      role="alert"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-xl"
        aria-hidden="true"
      >
        ⚠️
      </span>
      <h3 className="text-lg font-semibold text-rose-900">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate-600">{description}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
