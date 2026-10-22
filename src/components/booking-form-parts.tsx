/**
 * Presentational pieces shared by the user booking form (/booking) and the
 * admin booking form (/admin/booking). They carry no state or rules of their
 * own; each page keeps its own logic and wires its values through these.
 */
import type { ReactNode } from "react";
import { Label } from "~/components/ui/label";
import { RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

/** A labelled group of fields: the title sits on the left from md up. */
export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 px-4 py-5 sm:gap-4 sm:px-8 sm:py-7 md:grid-cols-[11rem_1fr] md:gap-10">
      <div>
        <h2 className="text-sm font-medium text-gray-900">{title}</h2>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-gray-500 sm:mt-1 sm:text-sm">{hint}</p>}
      </div>
      <div className="min-w-0 space-y-4 sm:space-y-5">{children}</div>
    </section>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
      {children}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-600">{message}</p>;
}

/** Hour and minute pickers for one time of day, read as "09 : 30". */
export function TimeField({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  hourOptions,
  minuteOptions,
  invalid,
  disabled,
  error,
}: {
  label: string;
  hour: string;
  minute: string;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
  hourOptions: string[];
  minuteOptions: string[];
  invalid?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  // Narrow enough that Start and End sit side by side on a phone.
  const trigger = `w-full px-2.5 tabular-nums hover:cursor-pointer sm:px-3 ${invalid ? "border-red-500" : ""}`;
  const labelId = `time-${label.toLowerCase()}-label`;
  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="mb-1.5 text-sm font-medium text-gray-700">
        {label}
      </p>
      <div className="flex items-center gap-1 sm:gap-2">
        <Select value={hour} onValueChange={onHourChange} disabled={disabled}>
          <SelectTrigger aria-label={`${label} hour`} className={trigger}>
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {hourOptions.map((option) => (
              <SelectItem key={option} value={option} className="tabular-nums hover:cursor-pointer">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span aria-hidden="true" className="text-gray-400">:</span>
        <Select value={minute} onValueChange={onMinuteChange} disabled={disabled}>
          <SelectTrigger aria-label={`${label} minute`} className={trigger}>
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {minuteOptions.map((option) => (
              <SelectItem key={option} value={option} className="tabular-nums hover:cursor-pointer">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <FieldError message={error} />
    </div>
  );
}

/**
 * One choice in a radio group, drawn as a bordered row with a visible radio.
 * `lone` is for a group with a single fixed option: the radio stays in the
 * markup for the group but is hidden, and the row reads as plain information.
 */
export function ChoiceOption({
  value,
  id,
  title,
  description,
  selected,
  disabled,
  lone,
}: {
  value: string;
  id: string;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  lone?: boolean;
}) {
  const tone = lone
    ? "cursor-default border-gray-200 bg-gray-50"
    : selected
      ? "cursor-pointer border-orange-500 bg-orange-50/40"
      : "cursor-pointer border-gray-200 bg-white hover:border-gray-300";

  return (
    <Label
      htmlFor={id}
      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 font-normal transition-colors sm:px-4 sm:py-3.5 ${tone}`}
    >
      <RadioGroupItem
        value={value}
        id={id}
        disabled={disabled}
        className={lone ? "sr-only" : "mt-0.5"}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900">{title}</span>
        <span className="mt-0.5 block text-sm text-gray-500">{description}</span>
      </span>
    </Label>
  );
}

/** Live availability for the chosen slot: a dot and a word, never an icon. */
export function AvailabilityStatus({
  checking,
  invalidTime,
  conflict,
}: {
  checking: boolean;
  invalidTime: boolean;
  conflict: boolean;
}) {
  const [tone, dot, text] = checking
    ? ["text-gray-600", "animate-pulse bg-gray-400", "Checking availability…"]
    : invalidTime
      ? ["text-red-700", "bg-red-500", "Invalid booking time"]
      : conflict
        ? ["text-red-700", "bg-red-500", "Time slot not available"]
        : ["text-green-700", "bg-green-500", "Time slot available"];

  return (
    <p role="status" className={`flex items-center gap-2 text-sm ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {text}
    </p>
  );
}
