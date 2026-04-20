"use client";

import { useState, useTransition } from "react";
import { syncActivitiesAction } from "@/app/actions/strava";
import styles from "./SyncStravaButton.module.scss";

export function SyncStravaButton({ planId }: { planId: string }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  function onClick() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const r = await syncActivitiesAction(planId);
      if (!r.ok) {
        setStatus({ kind: "error", message: r.error });
        return;
      }
      setStatus({
        kind: "success",
        message:
          r.newMatches === 0
            ? "Up to date — no new runs to match."
            : `Matched ${r.newMatches} new run${r.newMatches === 1 ? "" : "s"}.`,
      });
    });
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        onClick={onClick}
        disabled={pending}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.4 17.1L11.1 8.9 6.7 17.1H3L11.1 2l8.1 15.1h-3.8z" />
          <path d="M15.4 17.1l-2.3 4.4-2.2-4.4H8L13.1 22l5-9.9h-2.7z" opacity=".6" />
        </svg>
        {pending ? "Syncing…" : "Sync from Strava"}
      </button>
      {status.kind !== "idle" && (
        <span
          className={`${styles.status} ${styles[status.kind]}`}
          role="status"
        >
          {status.message}
        </span>
      )}
    </div>
  );
}
