"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHotkey } from "@tanstack/react-hotkeys";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 15;

export const SearchProductsButton = () => {
  const [showSearchButton, setShowSearchButton] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;

      if (currentScrollY <= 0) {
        setShowSearchButton(true);
        lastScrollY = 0;
        return;
      }

      if (Math.abs(scrollDiff) < THRESHOLD) {
        return;
      }

      if (scrollDiff > 0) {
        setShowSearchButton(false);
      } else {
        setShowSearchButton(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const openSearch = () => {
    setShowSearchButton(true);
    setIsOpen(true);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const closeSearch = () => {
    setIsOpen(false);
    setSearch("");
  };

  useHotkey("Control+K", (event) => {
    event.preventDefault();
    openSearch();
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: no closeSearch() in deps
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function handleSearch() {
    if (!search.trim()) {
      return;
    }
    router.push(`/search?input=${encodeURIComponent(search)}`);
    closeSearch();
  }

  return (
    <div
      className={cn(
        // Mobile/tablet: part of navbar layout.
        "relative block shrink-0",

        // Desktop xl+: floating search.
        "xl:fixed xl:right-6 xl:bottom-6 xl:z-50",

        "transition-all duration-300 ease-in-out",

        // Only hide on scroll for xl+.
        "xl:pointer-events-auto",
        "xl:translate-y-0 xl:opacity-100",

        !showSearchButton &&
          "xl:pointer-events-none xl:translate-y-4 xl:opacity-0"
      )}
    >
      <div
        className={cn(
          "flex h-9 items-center overflow-hidden rounded-md border bg-background shadow-sm",
          "transition-[width] duration-300 ease-out",

          isOpen ? "w-[min(58vw,18rem)] sm:w-72" : "w-9"
        )}
      >
        {/* Search button */}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Search Products"
          onClick={openSearch}
          className={cn("shrink-0", isOpen && "pointer-events-none")}
        >
          <SearchIcon
            className={cn(
              "transition-transform duration-300",
              isOpen && "scale-90"
            )}
          />
        </Button>

        {/* Search input */}
        <input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch();
            }
          }}
          placeholder="Search products..."
          className={cn(
            "min-w-0 flex-1 bg-transparent px-2 text-sm outline-none",
            "transition-[opacity,transform] duration-200",

            isOpen
              ? "translate-x-0 opacity-100"
              : "pointer-events-none -translate-x-2 opacity-0"
          )}
        />
      </div>
    </div>
  );
};
