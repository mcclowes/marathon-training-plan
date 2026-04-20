"use client";

import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import type { ProgressView as ProgressViewData } from "@/lib/progress/buildProgressView";
import { BlockTimeline } from "./BlockTimeline";
import { FocusDonut } from "./FocusDonut";
import { NextKeySession } from "./NextKeySession";
import { Section } from "./Section";
import { SessionGrid } from "./SessionGrid";
import { StatTiles } from "./StatTiles";
import { StatusBanner } from "./StatusBanner";
import { StatusRing } from "./StatusRing";
import { WeeklyMileageChart } from "./WeeklyMileageChart";
import styles from "./ProgressView.module.scss";

type ProgressViewContextValue = {
  view: ProgressViewData;
  planId: string;
};

const ProgressViewContext = createContext<ProgressViewContextValue | null>(
  null,
);

function useProgressViewContext(part: string): ProgressViewContextValue {
  const ctx = useContext(ProgressViewContext);
  if (!ctx) {
    throw new Error(
      `<ProgressView.${part}> must be rendered inside <ProgressView>`,
    );
  }
  return ctx;
}

function fmtRaceDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface ProgressViewProps {
  view: ProgressViewData;
  planId: string;
}

const DEFAULT_COMPOSITION: ReactNode = (
  <>
    <ProgressViewHero />
    <ProgressViewStatus />
    <ProgressViewStats />
    <ProgressViewWeeklyMileage />
    <ProgressViewSessionLog />
    <ProgressViewTrainingMix />
    <ProgressViewUpNext />
    <ProgressViewFooter />
  </>
);

const ProgressView: React.FC<PropsWithChildren<ProgressViewProps>> & {
  Hero: typeof ProgressViewHero;
  Status: typeof ProgressViewStatus;
  Stats: typeof ProgressViewStats;
  WeeklyMileage: typeof ProgressViewWeeklyMileage;
  SessionLog: typeof ProgressViewSessionLog;
  TrainingMix: typeof ProgressViewTrainingMix;
  UpNext: typeof ProgressViewUpNext;
  Footer: typeof ProgressViewFooter;
} = ({ view, planId, children }) => {
  return (
    <ProgressViewContext.Provider value={{ view, planId }}>
      <div className={styles.stack}>{children ?? DEFAULT_COMPOSITION}</div>
    </ProgressViewContext.Provider>
  );
};
ProgressView.displayName = "ProgressView";

function ProgressViewHero() {
  const { view } = useProgressViewContext("Hero");
  const currentWk = view.weeks.find((w) => w.weekNumber === view.nowWeek);
  const blockLabel = currentWk?.isTaper
    ? "Taper"
    : `Block ${currentWk?.blockNumber ?? 1}`;

  return (
    <div className={styles.heroCard}>
      <StatusRing view={view} />
      <div className={styles.heroBody}>
        <div>
          <div className={styles.kicker}>Currently in</div>
          <div className={styles.heroTitle}>
            {blockLabel}
            <span className={styles.heroWeek}>· Wk {view.nowWeek}</span>
          </div>
        </div>
        <BlockTimeline view={view} />
      </div>
    </div>
  );
}
ProgressViewHero.displayName = "ProgressView.Hero";
ProgressView.Hero = ProgressViewHero;

function ProgressViewStatus() {
  const { view } = useProgressViewContext("Status");
  return <StatusBanner view={view} />;
}
ProgressViewStatus.displayName = "ProgressView.Status";
ProgressView.Status = ProgressViewStatus;

function ProgressViewStats() {
  const { view } = useProgressViewContext("Stats");
  return <StatTiles view={view} />;
}
ProgressViewStats.displayName = "ProgressView.Stats";
ProgressView.Stats = ProgressViewStats;

function ProgressViewWeeklyMileage() {
  const { view } = useProgressViewContext("WeeklyMileage");
  return (
    <Section
      title="Weekly mileage — planned vs actual"
      accessory={<span className={styles.unitTag}>km</span>}
    >
      <WeeklyMileageChart view={view} />
    </Section>
  );
}
ProgressViewWeeklyMileage.displayName = "ProgressView.WeeklyMileage";
ProgressView.WeeklyMileage = ProgressViewWeeklyMileage;

function ProgressViewSessionLog() {
  const { view } = useProgressViewContext("SessionLog");
  return (
    <Section
      title="Session log"
      accessory={
        <span className={styles.unitTag}>{view.weeks.length} wks</span>
      }
    >
      <SessionGrid view={view} />
    </Section>
  );
}
ProgressViewSessionLog.displayName = "ProgressView.SessionLog";
ProgressView.SessionLog = ProgressViewSessionLog;

function ProgressViewTrainingMix() {
  const { view } = useProgressViewContext("TrainingMix");
  return (
    <Section title="Training mix">
      <FocusDonut view={view} />
    </Section>
  );
}
ProgressViewTrainingMix.displayName = "ProgressView.TrainingMix";
ProgressView.TrainingMix = ProgressViewTrainingMix;

function ProgressViewUpNext() {
  const { view, planId } = useProgressViewContext("UpNext");
  return (
    <Section title="Up next">
      <NextKeySession view={view} planId={planId} />
    </Section>
  );
}
ProgressViewUpNext.displayName = "ProgressView.UpNext";
ProgressView.UpNext = ProgressViewUpNext;

function ProgressViewFooter() {
  const { view } = useProgressViewContext("Footer");
  return (
    <div className={styles.foot}>
      {view.planMeta.raceDistance} · {fmtRaceDate(view.planMeta.raceDate)}
    </div>
  );
}
ProgressViewFooter.displayName = "ProgressView.Footer";
ProgressView.Footer = ProgressViewFooter;

export { ProgressView };
