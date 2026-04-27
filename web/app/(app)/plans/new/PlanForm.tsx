"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generatePlanAction } from "@/app/actions/plans";
import styles from "./PlanForm.module.scss";

type Style = "Endurance" | "Speedster";

export function PlanForm({ minRaceDate }: { minRaceDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>("Endurance");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const input = {
      raceDate: String(fd.get("raceDate")),
      sessionsPerWeek: Number(fd.get("sessionsPerWeek")),
      currentMileage: Number(fd.get("currentMileage")),
      targetMileage: Number(fd.get("targetMileage")),
      currentPace: String(fd.get("currentPace")),
      targetPace: String(fd.get("targetPace")),
      raceDistance: "Marathon",
      style,
    };

    startTransition(async () => {
      const result = await generatePlanAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/plans/${result.planId}`);
    });
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.group}>
        <label className={styles.label} htmlFor="raceDate">
          Race date
        </label>
        <input
          id="raceDate"
          name="raceDate"
          type="date"
          required
          className={styles.input}
          min={minRaceDate}
        />
        <span className={styles.hint}>Needs at least 8 weeks from today.</span>
      </div>

      <div className={styles.row}>
        <div className={styles.group}>
          <label className={styles.label} htmlFor="currentMileage">
            Current km / week
          </label>
          <input
            id="currentMileage"
            name="currentMileage"
            type="number"
            min={10}
            max={300}
            step={1}
            required
            defaultValue={40}
            className={styles.input}
          />
        </div>
        <div className={styles.group}>
          <label className={styles.label} htmlFor="targetMileage">
            Target km / week
          </label>
          <input
            id="targetMileage"
            name="targetMileage"
            type="number"
            min={10}
            max={300}
            step={1}
            required
            defaultValue={80}
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.group}>
          <label className={styles.label} htmlFor="currentPace">
            Current marathon time
          </label>
          <input
            id="currentPace"
            name="currentPace"
            type="text"
            required
            placeholder="04:00:00"
            pattern="\d{2}:\d{2}:\d{2}"
            defaultValue="04:00:00"
            className={styles.input}
          />
        </div>
        <div className={styles.group}>
          <label className={styles.label} htmlFor="targetPace">
            Target marathon time
          </label>
          <input
            id="targetPace"
            name="targetPace"
            type="text"
            required
            placeholder="03:30:00"
            pattern="\d{2}:\d{2}:\d{2}"
            defaultValue="03:30:00"
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="sessionsPerWeek">
          Sessions per week
        </label>
        <select
          id="sessionsPerWeek"
          name="sessionsPerWeek"
          defaultValue={4}
          className={styles.select}
        >
          <option value={3}>3 — time-pressed</option>
          <option value={4}>4 — balanced</option>
          <option value={5}>5 — high volume</option>
        </select>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Training style</span>
        <div className={styles.toggle} role="tablist">
          {(["Endurance", "Speedster"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={style === s}
              className={`${styles.toggleOption} ${style === s ? styles.active : ""}`}
              onClick={() => setStyle(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Generating…" : "Generate plan"}
      </button>
    </form>
  );
}
