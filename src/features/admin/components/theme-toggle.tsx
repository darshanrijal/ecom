"use client";

import { useEffect, useState } from "react";
import { MoonStarIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="text-muted-foreground"
    >
      {!mounted || resolvedTheme === "light" ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonStarIcon className="size-4" />
      )}
    </Button>
  );
}
