import { AnnouncementBar } from "@/features/homepage/components/announcement-bar";
import { Footer } from "@/features/homepage/components/footer";
import { Navbar } from "@/features/homepage/components/navbar";
import { preventUnauthorized } from "@/lib/auth";

export default async function WithNavbarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await preventUnauthorized();
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
