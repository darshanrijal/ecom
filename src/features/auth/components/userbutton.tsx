"use client";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/__rpc/client";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  HeartIcon,
  LogInIcon,
  PackageIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";

interface UserButtonProps {
  className?: string;
}

const NAME_SEPARATOR = /\s+/;

export const UserButton = ({ className }: UserButtonProps) => {
  const { data, isPending: sessionPending } = authClient.useSession();
  const isLoggedIn = !!data?.session.id;
  const initials =
    data?.user.name
      ?.trim()
      .split(NAME_SEPARATOR)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") ||
    data?.user.email?.charAt(0).toUpperCase() ||
    "U";
  const [openPopover, setOpenPopover] = useState(false);

  const { data: adminState } = trpc.admin.check.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  if (sessionPending && !data) {
    return <Skeleton className="size-8 rounded-full" aria-hidden="true" />;
  }

  if (!isLoggedIn) {
    return (
      <Button
        variant="link"
        size="sm"
        aria-label="Sign in"
        className="gap-1.5 text-muted-foreground"
        nativeButton={false}
        render={
          <Link href="/sign-in">
            <LogInIcon className="size-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Link>
        }
      />
    );
  }

  return (
    <Popover open={openPopover} onOpenChange={setOpenPopover}>
      <PopoverTrigger
        nativeButton={false}
        aria-label={`Account menu for ${data?.user.name ?? "your account"}`}
        render={
          <span className={cn("inline-flex cursor-pointer", className)}>
            <Avatar>
              <AvatarImage
                src={data?.user.image ?? undefined}
                alt=""
                className="hover:grayscale"
              />
              <AvatarFallback>{initials}</AvatarFallback>
              <AvatarBadge className="bg-green-500" />
            </Avatar>
          </span>
        }
      />

      <PopoverContent aria-label="Account menu" className="w-80">
        <div>
          <p className="truncate font-semibold">{data?.user.name}</p>
          <p className="truncate text-muted-foreground text-sm">
            {data?.user.email}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2"
            nativeButton={false}
            render={
              <Link href="/orders">
                <PackageIcon className="size-4" />
                Orders
              </Link>
            }
          />

          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2"
            nativeButton={false}
            render={
              <Link href="/favorites">
                <HeartIcon className="size-4" />
                Favorites
              </Link>
            }
          />

          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2"
            nativeButton={false}
            render={
              <Link href="/settings">
                <SettingsIcon className="size-4" />
                Settings
              </Link>
            }
          />

          {!!adminState?.isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2"
              nativeButton={false}
              render={
                <Link href="/admin">
                  <ShieldCheckIcon className="size-4" />
                  Admin panel
                </Link>
              }
            />
          )}
        </div>

        <div className="mt-3 border-t pt-2">
          <LogoutButton
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            Sign out
          </LogoutButton>
        </div>
      </PopoverContent>
    </Popover>
  );
};
