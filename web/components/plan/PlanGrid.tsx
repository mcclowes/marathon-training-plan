import type { z } from "zod";
import type { PlanWeekSchema } from "@/lib/storage/schemas";
import { WeekRow } from "./WeekRow";
import styles from "./PlanGrid.module.scss";

type PlanWeek = z.infer<typeof PlanWeekSchema>;

export function PlanGrid({
  weeks,
  planId,
  completions,
}: {
  weeks: PlanWeek[];
  planId: string;
  completions: Record<string, string>;
}) {
  return (
    <div className={styles.grid}>
      {weeks.map((w) => (
        <WeekRow
          key={w.weekNumber}
          week={w}
          planId={planId}
          completions={completions}
        />
      ))}
    </div>
  );
}
