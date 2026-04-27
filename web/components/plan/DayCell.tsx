import Link from "next/link";
import type { z } from "zod";
import type { PlanDaySchema } from "@/lib/storage/schemas";

type PlanDay = z.infer<typeof PlanDaySchema>;
import { FocusBadge } from "./FocusBadge";
import styles from "./DayCell.module.scss";

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

function isToday(dateStr: string): boolean {
  return new Date().toISOString().split("T")[0] === dateStr;
}

function fmtDayNum(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function DayCell({
  day,
  planId,
  done,
}: {
  day: PlanDay;
  planId: string;
  done: boolean;
}) {
  const today = isToday(day.dateStr);
  const rest = day.focusArea === "Rest";

  const cls = [
    styles.cell,
    today ? styles.today : "",
    done ? styles.done : "",
    rest ? styles.rest : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={`/plans/${planId}/day/${day.dateStr}`} className={cls}>
      <div className={styles.dayStrip}>
        <span className={styles.abbr}>{DAY_ABBR[day.dayOfWeek] ?? day.dayOfWeek}</span>
        <span className={styles.date}>{fmtDayNum(day.dateStr)}</span>
      </div>

      <div className={styles.body}>
        <span className={styles.summary}>{day.sessionSummary || day.focusArea}</span>
        <span className={styles.meta}>
          <FocusBadge focusArea={day.focusArea} />
        </span>
      </div>

      {day.totalDistance > 0 ? (
        <span className={styles.distance}>
          {day.totalDistance}
          <small>km</small>
        </span>
      ) : (
        <span className={`${styles.check} ${done ? styles.checked : ""}`}>
          {done && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      )}
    </Link>
  );
}
