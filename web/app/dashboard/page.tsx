import Link from "next/link";
import { auth } from "@/auth";
import { requireUserId } from "@/lib/auth/session";
import { listPlans } from "@/lib/storage/plans";
import styles from "./page.module.scss";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = await requireUserId();
  const plans = await listPlans(userId);

  const sorted = [...plans].sort((a, b) => a.raceDate.localeCompare(b.raceDate));

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Your plans</h1>
        <span>
          {session?.user?.name ?? "Athlete"} · {plans.length} plan
          {plans.length === 1 ? "" : "s"}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>
          <p>No plans yet. Plan creation lands in Phase 4.</p>
        </div>
      ) : (
        <ul className={styles.planList}>
          {sorted.map((p) => (
            <li key={p.planId}>
              <Link href={`/plans/${p.planId}`} className={styles.planCard}>
                <div>
                  <h2>
                    {p.raceDistance} · {fmtDate(p.raceDate)}
                  </h2>
                  <dl>
                    {p.totalWeeks} weeks · generated {fmtDate(p.generatedAt)}
                  </dl>
                </div>
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
