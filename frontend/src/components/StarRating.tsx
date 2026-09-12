/** Read-only star display. The numeric value is always exposed to assistive tech. */
import { useId } from "react";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  reviewCount?: number;
}

const SIZE_CLASS = { sm: "text-sm", md: "text-base", lg: "text-xl" } as const;

function Star({ fill }: { fill: number }) {
  // fill is 0..1 - the gradient stop gives us half stars without extra assets.
  // useId keeps the gradient id unique and stable (no impure render).
  const id = useId();
  return (
    <svg viewBox="0 0 20 20" className="h-[1em] w-[1em]" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--color-star-400)" />
          <stop offset={`${fill * 100}%`} stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <path
        d="M10 1.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L10 14.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export function StarRating({ rating, size = "md", showValue = true, reviewCount }: StarRatingProps) {
  const label =
    rating > 0
      ? `Rated ${rating.toFixed(1)} out of 5${
          reviewCount !== undefined ? ` from ${reviewCount} reviews` : ""
        }`
      : "No ratings yet";

  return (
    <span className={`inline-flex items-center gap-1.5 ${SIZE_CLASS[size]}`}>
      <span className="flex gap-0.5 text-star-400" role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map((index) => (
          <Star key={index} fill={Math.min(Math.max(rating - index, 0), 1)} />
        ))}
      </span>
      {showValue && (
        <span className="font-semibold text-slate-900">
          {rating > 0 ? rating.toFixed(1) : "New"}
        </span>
      )}
    </span>
  );
}
