import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { getCompletions } from "@/lib/storage/completions";
import { getPlan } from "@/lib/storage/plans";
import styles from "./page.module.scss";

type Props = { params: Promise<{ id: string }> };

export default async function PlanPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();

  const [plan, completions] = await Promise.all([
    getPlan(userId, id),
    getCompletions(userId, id),
  ]);

  if (!plan) notFound();

  const { planMeta, weeks } = plan;
  const done = completions.completed;

  return (
    <main className={styles.main}>
      <h1>
        {planMeta.raceDistance} · {planMeta.raceDate}
      </h1>

      <dl className={styles.meta}>
        <div>
          <dt>Weeks</dt>
          <dd>{planMeta.totalWeeks}</dd>
        </div>
        <div>
          <dt>Blocks</dt>
          <dd>{planMeta.planBlockCount}</dd>
        </div>
        <div>
          <dt>Starting mileage</dt>
          <dd>{planMeta.startingDistance} km/wk</dd>
        </div>
        <div>
          <dt>Target mileage</dt>
          <dd>{planMeta.targetDistance} km/wk</dd>
        </div>
      </dl>

      {weeks.map((w) => (
        <section key={w.weekNumber} className={styles.week}>
          <h3>
            Week {w.weekNumber} — {w.totalMileage} km
          </h3>
          <ul className={styles.dayList}>
            {w.days.map((d) => {
              const isDone = !!done[d.dateStr];
              return (
                <li
                  key={d.dateStr}
                  className={`${styles.day} ${isDone ? styles.complete : ""}`}
                >
                  <span>
                    {d.dayOfWeek} — {d.focusArea}
                  </span>
                  <span>
                    {d.sessionSummary}
                    {d.totalDistance ? ` · ${d.totalDistance} km` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
