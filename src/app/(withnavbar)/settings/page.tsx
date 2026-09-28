import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsClientPage } from "./page.client";

export default async function SettingsPage() {
  const { user, session } = await getCurrentSession();

  if (!user || !session) {
    redirect("/sign-in");
  }

  const accountWithPassword = await db.account.findFirst({
    where: {
      userId: user.id,
      password: { not: null },
    },
    select: { id: true },
  });

  return (
    <SettingsClientPage
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? "",
        emailVerified: user.emailVerified,
      }}
      sessionId={session.id}
      hasPassword={!!accountWithPassword}
    />
  );
}
