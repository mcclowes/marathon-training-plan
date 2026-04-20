import type { z } from "zod";
import type { PlanDaySchema } from "@/lib/storage/schemas";

type PlanDay = z.infer<typeof PlanDaySchema>;
import { CompleteToggle } from "./CompleteToggle";
import { FocusBadge } from "./FocusBadge";
import styles from "./DayDetail.module.scss";

export function DayDetail({
  day,
  planId,
  done,
}: {
  day: PlanDay;
  planId: string;
  done: boolean;
}) {
  const fullDate = new Date(day.dateStr).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className={styles.detail}>
      <header className={styles.header}>
        <span className={styles.date}>{fullDate}</span>
        <h2>{day.sessionSummary || day.focusArea}</h2>
        <FocusBadge focusArea={day.focusArea} />
      </header>

      {day.sessionDescription && (
        <section className={styles.section}>
          <span className={styles.title}>Session</span>
          <p className={styles.body}>{day.sessionDescription}</p>
        </section>
      )}

      {(day.totalDistance > 0 || day.warmUp > 0 || day.warmDown > 0) && (
        <dl className={styles.grid}>
          <div className={styles.tile}>
            <dt>Total</dt>
            <dd>{day.totalDistance || "—"} km</dd>
          </div>
          <div className={styles.tile}>
            <dt>Warm up</dt>
            <dd>{day.warmUp || "—"} km</dd>
          </div>
          <div className={styles.tile}>
            <dt>Warm down</dt>
            <dd>{day.warmDown || "—"} km</dd>
          </div>
        </dl>
      )}

      {day.paces && (
        <section className={styles.section}>
          <span className={styles.title}>Pace guidance</span>
          <pre className={styles.pace}>{day.paces}</pre>
        </section>
      )}

      {day.recoveries && day.recoveries !== "N/A" && (
        <section className={styles.section}>
          <span className={styles.title}>Recoveries</span>
          <p className={styles.body}>{day.recoveries}</p>
        </section>
      )}

      {day.focusArea !== "Rest" && day.focusArea !== "Race Day" && (
        <CompleteToggle planId={planId} dateStr={day.dateStr} initialDone={done} />
      )}
    </article>
  );
}
