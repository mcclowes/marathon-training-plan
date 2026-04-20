import Link from "next/link";
import { notFound } from "next/navigation";
import { DayDetail } from "@/components/plan/DayDetail";
import { requireUserId } from "@/lib/auth/session";
import { getCompletions } from "@/lib/storage/completions";
import { getPlan } from "@/lib/storage/plans";

type Props = { params: Promise<{ id: string; date: string }> };

export default async function DayPage({ params }: Props) {
  const { id, date } = await params;
  const userId = await requireUserId();

  const [plan, completions] = await Promise.all([
    getPlan(userId, id),
    getCompletions(userId, id),
  ]);

  if (!plan) notFound();

  const day = plan.days.find((d) => d.dateStr === date);
  if (!day) notFound();

  return (
    <>
      <Link
        href={`/plans/${id}`}
        style={{
          display: "inline-flex",
          gap: "var(--sp-2)",
          color: "var(--c-accent)",
          fontSize: "var(--fs-sm)",
          alignItems: "center",
        }}
      >
        ← Back to plan
      </Link>
      <DayDetail day={day} planId={id} done={!!completions.completed[date]} />
    </>
  );
}
