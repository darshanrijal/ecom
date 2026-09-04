"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

const THRESHOLD = 15; // Minimum scroll delta in px required to trigger toggle

export const SearchProductsButton = () => {
  // 1. Initialized to true so it shows on load
  const [show, setShow] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;

      // 2. If scrolled back all the way to the top, force show
      if (currentScrollY <= 0) {
        setShow(true);
        lastScrollY = 0;
        return;
      }

      // Ignore micro-scrolls smaller than the threshold
      if (Math.abs(scrollDiff) < THRESHOLD) {
        return;
      }

      // Hide on scroll down, show on scroll up
      if (scrollDiff > 0) {
        setShow(false);
      } else {
        setShow(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed right-6 bottom-6 z-50 hidden transform transition-all duration-300 ease-in-out xl:block",
        show
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <Button size="icon-sm" variant="ghost" title="Search Products">
        <SearchIcon />
      </Button>
    </div>
  );
};
