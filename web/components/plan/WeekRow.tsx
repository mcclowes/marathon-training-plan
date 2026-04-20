import type { z } from "zod";
import type { PlanWeekSchema } from "@/lib/storage/schemas";
import { DayCell } from "./DayCell";
import styles from "./WeekRow.module.scss";

type PlanWeek = z.infer<typeof PlanWeekSchema>;

function weekKind(week: PlanWeek): "build" | "taper" {
  return week.isTaper ? "taper" : "build";
}

function fmtRange(week: PlanWeek): string {
  const first = week.days[0]?.dateStr;
  const last = week.days[week.days.length - 1]?.dateStr;
  if (!first || !last) return "";
  const f = new Date(first).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const l = new Date(last).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${f} — ${l}`;
}

export function WeekRow({
  week,
  planId,
  completions,
}: {
  week: PlanWeek;
  planId: string;
  completions: Record<string, string>;
}) {
  const kind = weekKind(week);

  return (
    <section className={styles.week}>
      <header className={styles.header}>
        <div className={styles.num}>
          <span>Wk {week.weekNumber}</span>
          <small className={styles[kind]}>
            {kind === "build" ? "Build" : "Taper"}
          </small>
        </div>
        <span className={styles.range}>{fmtRange(week)}</span>
        <span className={styles.total}>
          {week.totalMileage}
          <small>km</small>
        </span>
      </header>
      <div className={styles.days}>
        {week.days.map((d) => (
          <DayCell
            key={d.dateStr}
            day={d}
            planId={planId}
            done={!!completions[d.dateStr]}
          />
        ))}
      </div>
    </section>
  );
}
