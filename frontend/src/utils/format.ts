/** Presentation helpers shared across components. */

/** "12 September 2026" - readable and unambiguous for an international audience. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Ratings always show one decimal so cards do not jump between "5" and "4.7". */
export function formatRating(rating: number): string {
  return rating > 0 ? rating.toFixed(1) : "-";
}

/** "1 review" / "12 reviews" */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Compact thousands for the hero counters: 1200 -> "1.2k". */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

/** Initials for the reviewer avatar bubble. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}
