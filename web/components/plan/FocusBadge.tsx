import styles from "./FocusBadge.module.scss";

const KEY_MAP: Record<string, string> = {
  Rest: "rest",
  Recovery: "recovery",
  Speed: "speed",
  "Speed Endurance": "se",
  SE: "se",
  Tempo: "tempo",
  Base: "base",
  "Long Run": "longrun",
  "Race Day": "race",
  "Pre-Race Shakeout": "taper",
};

export function focusKey(focusArea: string): string {
  return KEY_MAP[focusArea] ?? "rest";
}

export function FocusBadge({ focusArea }: { focusArea: string }) {
  const key = focusKey(focusArea);
  return <span className={`${styles.badge} ${styles[key]}`}>{focusArea}</span>;
}
