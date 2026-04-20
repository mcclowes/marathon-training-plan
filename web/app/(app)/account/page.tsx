import { auth } from "@/auth";
import { AccountSection } from "@/components/shell/AccountSection";
import styles from "./page.module.scss";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized — no signed-in user");

  return (
    <>
      <header className={styles.header}>
        <h1>Account</h1>
      </header>
      <AccountSection
        name={session.user.name}
        image={session.user.image}
        athleteId={session.user.athleteId}
      />
    </>
  );
}
