"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/__rpc/client";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { formatDate } from "date-fns";
import { Check, Monitor, Smartphone, Tablet, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

interface UserButtonProps {
  className?: string;
}

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
  const { data } = authClient.useSession();
  const utils = trpc.useUtils();
  const isLoggedIn = !!data?.session.id;
  const [isLoggingOut, startTransition] = useTransition();
  const initials = data?.user.name?.charAt(0).toUpperCase() || "U";
  const router = useRouter();
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

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/sign-in");
    });
  }

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

  return (
    <Popover
      open={openPopover}
      onOpenChange={(open) => {
        if (!isLoggedIn) {
          return;
        }
        setOpenPopover(open);
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        render={
          <Avatar className={cn("cursor-pointer", className)}>
            <AvatarImage
              src={data?.user.image ?? undefined}
              alt={data?.user.name ?? "User"}
              className="hover:grayscale"
            />

            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
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

        <div>
          <Button disabled={isLoggingOut} onClick={handleSignOut}>
            {!!isLoggingOut && <Spinner className="text-sm" />}
            Sign out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
