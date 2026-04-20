import type { Metadata } from "next";
import { PlanForm } from "./PlanForm";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "New plan",
};

export default function NewPlanPage() {
  // Server Component; Date.now() is fine here and re-evaluated on every request.
  // eslint-disable-next-line react-hooks/purity
  const minRaceDate = new Date(Date.now() + 56 * 86_400_000)
    .toISOString()
    .split("T")[0];
  return (
    <>
      <header className={styles.header}>
        <h1>New plan</h1>
        <p>Tell Flow about your race and Flow builds the block structure.</p>
      </header>
      <PlanForm minRaceDate={minRaceDate} />
    </>
  );
}
