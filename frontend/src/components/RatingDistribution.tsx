/**
 * 5-to-1 star distribution bars.
 *
 * Percentages come from the API (computed over visible reviews) so the chart
 * can never disagree with the displayed average.
 */
import { pluralise } from "../utils/format";
import type { RatingBucket } from "../types";

export function RatingDistribution({
  distribution,
  totalReviews,
}: {
  distribution: RatingBucket[];
  totalReviews: number;
}) {
  if (totalReviews === 0) {
    return (
      <p className="text-sm text-slate-600">
        No ratings yet - be the first to share your experience.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">
        Rating distribution across {pluralise(totalReviews, "review")}
      </caption>
      <tbody>
        {distribution.map((bucket) => (
          <tr key={bucket.rating}>
            <th scope="row" className="whitespace-nowrap py-1 pr-3 text-left font-medium text-slate-600">
              {bucket.rating} star
            </th>
            <td className="w-full py-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-star-400 transition-[width] duration-500"
                  style={{ width: `${bucket.percentage}%` }}
                />
              </div>
            </td>
            <td className="py-1 pl-3 text-right tabular-nums text-slate-600">
              {bucket.percentage}%
            </td>
            <td className="py-1 pl-2 text-right tabular-nums text-xs text-slate-500">
              ({bucket.count})
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
