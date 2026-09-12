/**
 * Accessible form field wrapper.
 *
 * Ties the label, the control and its error message together with ids so
 * screen readers announce the problem, and marks the error with text plus an
 * icon rather than colour alone.
 */
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function Field({ id, label, error, hint, required, children }: FieldShellProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="ml-1 text-rose-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({ id, describedBy: describedBy || undefined, invalid: Boolean(error) })}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId}>
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  error?: string;
  hint?: ReactNode;
};

export function TextField({ label, id, error, hint, required, ...rest }: TextFieldProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      {({ describedBy, invalid }) => (
        <input
          id={id}
          className={`field-input ${invalid ? "field-input-error" : ""}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      )}
    </Field>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  id: string;
  error?: string;
  hint?: ReactNode;
};

export function TextAreaField({ label, id, error, hint, required, ...rest }: TextAreaFieldProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      {({ describedBy, invalid }) => (
        <textarea
          id={id}
          className={`field-input ${invalid ? "field-input-error" : ""}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      )}
    </Field>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
};

export function SelectField({ label, id, error, children, ...rest }: SelectFieldProps) {
  return (
    <Field id={id} label={label} error={error}>
      {({ describedBy, invalid }) => (
        <select
          id={id}
          className={`field-input ${invalid ? "field-input-error" : ""}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
}
