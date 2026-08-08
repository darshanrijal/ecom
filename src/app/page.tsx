import { LogoutButton } from "@/components/logout-button";
import { preventUnauthorized } from "@/lib/auth";

export default async function Home() {
  const { session, user } = await preventUnauthorized();
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
