/**
 * The one way a booking's status is shown: a wash, the status tone as text,
 * and a small dot before the word. No icon.
 */
const STATUS_STYLES: Record<string, { label: string; pill: string; dot: string }> = {
  accepted: { label: "Accepted", pill: "bg-green-50 text-green-700", dot: "bg-green-500" },
  pending: { label: "Pending", pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  rejected: { label: "Rejected", pill: "bg-red-50 text-red-700", dot: "bg-red-500" },
  cancelled: { label: "Cancelled", pill: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  // Finished, not a warning and not a student lab, so ink rather than a hue.
  completed: { label: "Completed", pill: "bg-gray-100 text-gray-900", dot: "bg-gray-900" },
};

export function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const style = STATUS_STYLES[(status ?? "").toLowerCase()] ?? {
    label: status || "Unknown",
    pill: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${style.pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
