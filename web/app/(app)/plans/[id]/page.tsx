import { notFound } from "next/navigation";
import { PlanActionsMenu } from "@/components/plan/PlanActionsMenu";
import { PlanSummary } from "@/components/plan/PlanSummary";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { requireUserId } from "@/lib/auth/session";
import { getCompletions } from "@/lib/storage/completions";
import { getPlan } from "@/lib/storage/plans";
import { getStravaTokens } from "@/lib/storage/strava";
import styles from "./page.module.scss";

type Props = { params: Promise<{ id: string }> };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PlanPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();

  const [plan, completions, tokens] = await Promise.all([
    getPlan(userId, id),
    getCompletions(userId, id),
    getStravaTokens(userId),
  ]);

  if (!plan) notFound();

  const { planMeta, weeks } = plan;
  const stravaConnected = !!tokens;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.kicker}>
          {planMeta.raceDistance} · {fmtDate(planMeta.raceDate)}
        </div>
        <h1 className={styles.title}>Plan summary</h1>
      </header>

      <div className={styles.tabsRow}>
        <PlanTabs planId={id} active="summary" />
        <PlanActionsMenu
          planId={id}
          planLabel={`${planMeta.raceDistance} — ${fmtDate(planMeta.raceDate)}`}
          weeks={weeks}
          completions={completions.completed}
          stravaConnected={stravaConnected}
          redirectTo="/dashboard"
        />
      </div>

      <PlanSummary plan={plan} planId={id} />
    </>
  );
}
