import { LogoutButton } from "@/components/logout-button";
import { getCurrentSession } from "@/lib/auth";

export default async function Home() {
  const { session, user } = await getCurrentSession();
  if (session) {
    return (
      <main>
        <pre>{JSON.stringify({ session, user }, null, 2)}</pre>
        <LogoutButton />
      </main>
    );
  }

  return <main>GADA ELECTRONICS</main>;
}
