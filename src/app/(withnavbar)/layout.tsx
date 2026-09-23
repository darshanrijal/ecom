import { AnnouncementBar } from "@/features/homepage/components/announcement-bar";
import { Footer } from "@/features/homepage/components/footer";
import { Navbar } from "@/features/homepage/components/navbar";

export default function WithNavbarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
