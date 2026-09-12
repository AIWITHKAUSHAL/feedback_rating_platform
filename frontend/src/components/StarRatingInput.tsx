/**
 * Interactive 1-5 star picker.
 *
 * Built from real radio inputs so it works with a keyboard (arrow keys) and is
 * announced correctly by screen readers; the stars are the visual layer.
 */
interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  error?: string;
  disabled?: boolean;
}

const LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export function StarRatingInput({ value, onChange, error, disabled }: StarRatingInputProps) {
  return (
    <fieldset disabled={disabled}>
      <legend className="field-label">
        Your rating
        <span className="ml-1 text-rose-600" aria-hidden="true">
          *
        </span>
      </legend>

      <div className="flex items-center gap-3">
        <div className="flex gap-1" role="radiogroup" aria-label="Rating out of 5">
          {[1, 2, 3, 4, 5].map((star) => {
            const selected = star <= value;
            return (
              <label
                key={star}
                className="cursor-pointer rounded-md p-0.5 focus-within:ring-2 focus-within:ring-brand-500"
                title={`${star} - ${LABELS[star]}`}
              >
                <input
                  type="radio"
                  name="rating"
                  value={star}
                  checked={value === star}
                  onChange={() => onChange(star)}
                  className="sr-only"
                  aria-label={`${star} star${star > 1 ? "s" : ""} - ${LABELS[star]}`}
                />
                <svg
                  viewBox="0 0 20 20"
                  className={`h-8 w-8 transition ${
                    selected ? "text-star-400" : "text-slate-300 hover:text-star-400/60"
                  }`}
                  aria-hidden="true"
                >
                  <path
                    d="M10 1.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L10 14.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z"
                    fill="currentColor"
                  />
                </svg>
              </label>
            );
          })}
        </div>
        {/* Text alongside the stars: rating is never communicated by colour alone. */}
        <span className="text-sm font-medium text-slate-600" aria-live="polite">
          {value > 0 ? `${value}/5 · ${LABELS[value]}` : "Select a rating"}
        </span>
      </div>

      {error && (
        <p className="field-error" id="rating-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
