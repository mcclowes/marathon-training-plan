import Link from "next/link";
import { focusKeyOf, FOCUS_COLORS } from "@/lib/progress/buildProgressView";
import type { StoredPlan } from "@/lib/storage/schemas";
import styles from "./PlanSummary.module.scss";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

type Block = {
  blockNumber: number;
  startWeek: number;
  endWeek: number;
  minMileage: number;
  maxMileage: number;
  isTaper: boolean;
};

function summariseBlocks(plan: StoredPlan): Block[] {
  const blocks = new Map<number, Block>();
  for (const wk of plan.weeks) {
    const existing = blocks.get(wk.blockNumber);
    if (!existing) {
      blocks.set(wk.blockNumber, {
        blockNumber: wk.blockNumber,
        startWeek: wk.weekNumber,
        endWeek: wk.weekNumber,
        minMileage: wk.totalMileage,
        maxMileage: wk.totalMileage,
        isTaper: wk.isTaper,
      });
    } else {
      existing.endWeek = wk.weekNumber;
      existing.minMileage = Math.min(existing.minMileage, wk.totalMileage);
      existing.maxMileage = Math.max(existing.maxMileage, wk.totalMileage);
      existing.isTaper = existing.isTaper || wk.isTaper;
    }
  }
  return Array.from(blocks.values()).sort(
    (a, b) => a.startWeek - b.startWeek,
  );
}

type FocusShare = {
  key: ReturnType<typeof focusKeyOf>;
  label: string;
  km: number;
  share: number;
};

function focusMix(plan: StoredPlan): FocusShare[] {
  const totals = new Map<string, { key: ReturnType<typeof focusKeyOf>; km: number }>();
  let grand = 0;
  for (const day of plan.days) {
    if (!day.totalDistance) continue;
    const key = focusKeyOf(day.focusArea);
    const km = day.totalDistance;
    grand += km;
    const existing = totals.get(day.focusArea);
    if (existing) existing.km += km;
    else totals.set(day.focusArea, { key, km });
  }
  if (grand <= 0) return [];
  return Array.from(totals.entries())
    .map(([label, { key, km }]) => ({
      key,
      label,
      km: Math.round(km / 100) / 10,
      share: km / grand,
    }))
    .sort((a, b) => b.share - a.share);
}

export function PlanSummary({
  plan,
  planId,
}: {
  plan: StoredPlan;
  planId: string;
}) {
  const { planMeta, weeks, days } = plan;

  const totalPlannedKm =
    Math.round(days.reduce((s, d) => s + d.totalDistance, 0) / 100) / 10;
  const sessionCount = days.filter(
    (d) => d.focusArea !== "Rest" && d.totalDistance > 0,
  ).length;
  const avgWeekly = weeks.length
    ? Math.round((totalPlannedKm / weeks.length) * 10) / 10
    : 0;

  const nonTaperWeeks = weeks.filter((w) => !w.isTaper);
  const peakWeek = nonTaperWeeks.reduce<typeof weeks[number] | null>(
    (best, w) => (!best || w.totalMileage > best.totalMileage ? w : best),
    null,
  );
  const firstTaper = weeks.find((w) => w.isTaper);
  const raceDay = days[days.length - 1];
  const firstDay = days[0];

  const blocks = summariseBlocks(plan);
  const mix = focusMix(plan);

  const countdown = daysUntil(planMeta.raceDate);
  const countdownLabel =
    countdown > 1
      ? `${countdown} days to go`
      : countdown === 1
        ? "1 day to go"
        : countdown === 0
          ? "Race day is today"
          : `${Math.abs(countdown)} days ago`;

  return (
    <div className={styles.stack}>
      <div className={styles.countdownCard}>
        <div className={styles.countdownLabel}>Race countdown</div>
        <div className={styles.countdownValue}>
          {countdown >= 0 ? countdown : `+${Math.abs(countdown)}`}
          <small>{countdown === 1 || countdown === -1 ? "day" : "days"}</small>
        </div>
        <div className={styles.countdownMeta}>
          {planMeta.raceDistance} · {fmtDate(planMeta.raceDate)}
          <span className={styles.dot} aria-hidden="true">·</span>
          {countdownLabel}
        </div>
      </div>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h3>Overview</h3>
          <span className={styles.unitTag}>{planMeta.style}</span>
        </header>
        <dl className={styles.overviewGrid}>
          <div className={styles.overviewTile}>
            <dt>Total planned</dt>
            <dd>
              {totalPlannedKm.toLocaleString()}
              <small> km</small>
            </dd>
          </div>
          <div className={styles.overviewTile}>
            <dt>Avg / week</dt>
            <dd>
              {avgWeekly}
              <small> km</small>
            </dd>
          </div>
          <div className={styles.overviewTile}>
            <dt>Sessions</dt>
            <dd>{sessionCount}</dd>
          </div>
          <div className={styles.overviewTile}>
            <dt>Weeks</dt>
            <dd>{planMeta.totalWeeks}</dd>
          </div>
          <div className={styles.overviewTile}>
            <dt>Blocks</dt>
            <dd>{planMeta.planBlockCount}</dd>
          </div>
          <div className={styles.overviewTile}>
            <dt>Starting</dt>
            <dd>
              {planMeta.startingDistance}
              <small> km/w</small>
            </dd>
          </div>
          <div className={styles.overviewTile}>
            <dt>Target</dt>
            <dd>
              {planMeta.targetDistance}
              <small> km/w</small>
            </dd>
          </div>
          <div className={styles.overviewTile}>
            <dt>Generated</dt>
            <dd className={styles.generated}>{fmtShort(planMeta.generatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h3>Key dates</h3>
        </header>
        <ul className={styles.keyDates}>
          {firstDay && (
            <li>
              <span className={styles.keyLabel}>Plan starts</span>
              <span className={styles.keyValue}>{fmtDate(firstDay.dateStr)}</span>
            </li>
          )}
          {peakWeek && (
            <li>
              <span className={styles.keyLabel}>
                Peak week · Wk {peakWeek.weekNumber}
              </span>
              <span className={styles.keyValue}>
                {peakWeek.totalMileage} km ·{" "}
                {fmtShort(peakWeek.days[0]!.dateStr)}
              </span>
            </li>
          )}
          {firstTaper && (
            <li>
              <span className={styles.keyLabel}>
                Taper begins · Wk {firstTaper.weekNumber}
              </span>
              <span className={styles.keyValue}>
                {fmtDate(firstTaper.days[0]!.dateStr)}
              </span>
            </li>
          )}
          {raceDay && (
            <li>
              <span className={styles.keyLabel}>Race day</span>
              <span className={styles.keyValue}>{fmtDate(raceDay.dateStr)}</span>
            </li>
          )}
        </ul>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h3>Block breakdown</h3>
          <span className={styles.unitTag}>
            {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
          </span>
        </header>
        <ul className={styles.blocks}>
          {blocks.map((b) => (
            <li key={b.blockNumber} className={styles.blockRow}>
              <div className={styles.blockLabel}>
                <span className={styles.blockNum}>
                  {b.isTaper ? "Taper" : `Block ${b.blockNumber}`}
                </span>
                <span className={styles.blockRange}>
                  Wk {b.startWeek}
                  {b.endWeek !== b.startWeek ? `–${b.endWeek}` : ""}
                </span>
              </div>
              <div className={styles.blockMileage}>
                {b.minMileage === b.maxMileage
                  ? `${b.minMileage}`
                  : `${b.minMileage}–${b.maxMileage}`}
                <small> km/w</small>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {mix.length > 0 && (
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h3>Training mix</h3>
            <span className={styles.unitTag}>by distance</span>
          </header>
          <div className={styles.mixBar} aria-hidden="true">
            {mix.map((m) => (
              <span
                key={m.label}
                className={styles.mixSegment}
                style={{
                  width: `${Math.max(m.share * 100, 0.5)}%`,
                  background: FOCUS_COLORS[m.key],
                }}
              />
            ))}
          </div>
          <ul className={styles.mixLegend}>
            {mix.map((m) => (
              <li key={m.label}>
                <span
                  className={styles.mixSwatch}
                  style={{ background: FOCUS_COLORS[m.key] }}
                  aria-hidden="true"
                />
                <span className={styles.mixName}>{m.label}</span>
                <span className={styles.mixShare}>
                  {Math.round(m.share * 100)}%
                </span>
                <span className={styles.mixKm}>
                  {m.km.toLocaleString()} km
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href={`/plans/${planId}/plan`} className={styles.cta}>
        View full schedule →
      </Link>
    </div>
  );
}
