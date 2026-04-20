import { notFound } from "next/navigation";
import { DayDetail } from "@/components/plan/DayDetail";
import { Modal } from "@/components/plan/Modal";
import { requireUserId } from "@/lib/auth/session";
import { getCompletions } from "@/lib/storage/completions";
import { getPlan } from "@/lib/storage/plans";

type Props = { params: Promise<{ id: string; date: string }> };

export default async function InterceptedDayModal({ params }: Props) {
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
    <Modal>
      <DayDetail day={day} planId={id} done={!!completions.completed[date]} />
    </Modal>
  );
}
