"use client";

import { useState, useTransition } from "react";
import { toggleDayCompleteAction } from "@/app/actions/completions";
import styles from "./CompleteToggle.module.scss";

export function CompleteToggle({
  planId,
  dateStr,
  initialDone,
}: {
  planId: string;
  dateStr: string;
  initialDone: boolean;
}) {
  const [done, setDone] = useState(initialDone);
  const [pending, startTransition] = useTransition();

  function onClick() {
    const optimistic = !done;
    setDone(optimistic);
    startTransition(async () => {
      try {
        const next = await toggleDayCompleteAction(planId, dateStr);
        setDone(!!next.completed[dateStr]);
      } catch {
        setDone(!optimistic);
      }
    });
  }

  return (
    <button
      type="button"
      className={`${styles.toggle} ${done ? styles.done : ""}`}
      onClick={onClick}
      disabled={pending}
    >
      <span className={styles.check}>
        {done && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>{done ? "Session complete" : "Mark session complete"}</span>
    </button>
  );
}
