"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { SearchIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const SearchBar = ({ className }: { className?: string }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      aria-label="Search products"
      onSubmit={(event) => {
        event.preventDefault();

        const search = query.trim();

        if (!search) {
          return;
        }

        router.push(`/search?input=${encodeURIComponent(search)}`);
      }}
      className={cn("min-w-0 max-w-2xl flex-1", className)}
    >
      <InputGroup className="h-9 w-full rounded-full bg-muted/60">
        <InputGroupAddon className="text-muted-foreground">
          <SearchIcon />
        </InputGroupAddon>

        <InputGroupInput
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search products..."
          aria-label="Search products"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {query ? (
          <InputGroupButton
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Clear search"
            className="mr-1 text-muted-foreground"
            onClick={() => setQuery("")}
          >
            <XIcon />
          </InputGroupButton>
        ) : null}
      </InputGroup>
    </form>
  );
};
