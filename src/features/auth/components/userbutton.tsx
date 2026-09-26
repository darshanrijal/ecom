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
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/__rpc/client";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { formatDate } from "date-fns";
import {
  Check,
  LogInIcon,
  Monitor,
  ShieldCheckIcon,
  Smartphone,
  Tablet,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { LogoutButton } from "@/components/logout-button";

interface UserButtonProps {
  className?: string;
}

const NAME_SEPARATOR = /\s+/;

function DeviceIcon({ userAgent }: { userAgent: string | null }) {
  const agent = userAgent?.toLowerCase() ?? "";

  if (agent.includes("iphone") || agent.includes("android")) {
    return <Smartphone className="size-4" />;
  }

  if (agent.includes("ipad") || agent.includes("tablet")) {
    return <Tablet className="size-4" />;
  }

  return <Monitor className="size-4" />;
}

export const UserButton = ({ className }: UserButtonProps) => {
  const { data, isPending: sessionPending } = authClient.useSession();
  const utils = trpc.useUtils();
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
  const { mutate: deleteSession, isPending: isDeletingSession } =
    trpc.deleteSession.useMutation({
      onSuccess: () => {
        utils.getActiveSessions.invalidate();
        toast.add({
          title: "Session deleted",
          type: "success",
        });
      },
      onError: () => {
        toast.add({
          type: "error",
          title: "Failed to delete sesssion",
        });
      },
    });
  const { data: sessions, isPending } = trpc.getActiveSessions.useQuery(
    undefined,
    {
      enabled: isLoggedIn,
    }
  );

  const { data: adminState } = trpc.admin.check.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  // biome-ignore lint/correctness/noNestedComponentDefinitions: so not to add props
  function ActiveSessions() {
    if (isPending) {
      return (
        <div className="flex h-20 items-center justify-center">
          <Spinner />
        </div>
      );
    }

    if (!sessions?.length) {
      return (
        <p className="text-muted-foreground text-sm">No active sessions.</p>
      );
    }

    const currentSession = sessions.find(
      (session) => session.id === data?.session.id
    );

    const otherSessions = sessions.filter(
      (session) => session.id !== data?.session.id
    );

    return (
      <div className="space-y-4">
        {/* Current device */}
        {currentSession && (
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs">
              CURRENT DEVICE
            </p>

            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md border bg-background p-2">
                  <DeviceIcon userAgent={currentSession.userAgent} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-sm">
                      {currentSession.userAgent || "Unknown device"}
                    </p>

                    <span className="flex shrink-0 items-center gap-1 text-green-600 text-xs">
                      <Check className="size-3" />
                      This device
                    </span>
                  </div>

                  <p className="mt-1 text-muted-foreground text-xs">
                    {currentSession.ipAddress || "Unknown IP"}
                  </p>

                  <p className="text-muted-foreground text-xs">
                    Active since{" "}
                    {formatDate(
                      currentSession.createdAt,
                      "MMM d, yyyy - h:mm a"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other devices */}
        {otherSessions.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs">
              OTHER DEVICES
            </p>

            <div className="space-y-2">
              {otherSessions.map((session) => (
                <div key={session.id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md border p-2">
                      <DeviceIcon userAgent={session.userAgent} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {session.userAgent || "Unknown device"}
                      </p>

                      <p className="mt-1 text-muted-foreground text-xs">
                        {session.ipAddress || "Unknown IP"}
                      </p>

                      <p className="text-muted-foreground text-xs">
                        {formatDate(session.createdAt, "MMM d, yyyy - h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => deleteSession({ sessionId: session.id })}
                      size={"icon-sm"}
                      variant={"destructive"}
                      className={"rounded-full"}
                    >
                      {isDeletingSession ? <Spinner /> : <TrashIcon />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

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

      <PopoverContent className="w-96">
        <div>
          <p className="font-semibold">{data?.user.name}</p>
          <p className="text-muted-foreground">{data?.user.email}</p>
        </div>
        <PopoverHeader className="mt-2">
          <PopoverTitle>Your active sessions</PopoverTitle>
        </PopoverHeader>
        <ActiveSessions />

        {!!adminState?.isAdmin && (
          <div className="border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              nativeButton={false}
              render={
                <Link href="/admin">
                  <ShieldCheckIcon className="size-4" />
                  Admin panel
                </Link>
              }
            />
          </div>
        )}

        <div>
          <LogoutButton>Sign out</LogoutButton>
        </div>
      </PopoverContent>
    </Popover>
  );
};
