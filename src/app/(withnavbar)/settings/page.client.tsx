"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "date-fns";
import { trpc } from "@/__rpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { UploadButton } from "@/lib/utfs";
import {
  CheckIcon,
  ImageUpIcon,
  KeyRoundIcon,
  MailIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  TrashIcon,
  UserRoundIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { setPasswordAction } from "./actions";

interface SettingsClientPageProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
    emailVerified: boolean;
  };
  sessionId: string;
  hasPassword: boolean;
}

interface SessionRow {
  id: string;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

const NAME_SEPARATOR = /\s+/;

function initialsOf(name: string, email: string) {
  const initials = name
    .trim()
    .split(NAME_SEPARATOR)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || email.charAt(0).toUpperCase();
}

function DeviceIcon({ userAgent }: { userAgent: string | null }) {
  const agent = userAgent?.toLowerCase() ?? "";

  if (agent.includes("iphone") || agent.includes("android")) {
    return <SmartphoneIcon className="size-4" />;
  }

  if (agent.includes("ipad") || agent.includes("tablet")) {
    return <TabletIcon className="size-4" />;
  }

  return <MonitorIcon className="size-4" />;
}

function VerifyEmailBanner({
  email,
  isResending,
  onResend,
}: {
  email: string;
  isResending: boolean;
  onResend: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <MailIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">Verify your email</p>
        <p className="mt-0.5 text-muted-foreground text-sm">
          We sent a verification link to {email}. Check your inbox to verify
          your account.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onResend}
        disabled={isResending}
      >
        {isResending ? <Spinner /> : null}
        Resend email
      </Button>
    </div>
  );
}

function SessionsContent({
  sessions,
  isPending,
  isError,
  currentSessionId,
  isRevoking,
  onRevoke,
  onRetry,
}: {
  sessions: SessionRow[] | undefined;
  isPending: boolean;
  isError: boolean;
  currentSessionId: string;
  isRevoking: boolean;
  onRevoke: (input: { sessionId: string }) => void;
  onRetry: () => void;
}) {
  if (isPending) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-destructive text-sm">Couldn't load your sessions.</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  const currentSession = sessions?.find(
    (session) => session.id === currentSessionId
  );
  const otherSessions =
    sessions?.filter((session) => session.id !== currentSessionId) ?? [];

  if (!currentSession && otherSessions.length === 0) {
    return <p className="text-muted-foreground text-sm">No active sessions.</p>;
  }

  return (
    <div className="space-y-4">
      {currentSession ? (
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase">
            Current device
          </p>
          <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border bg-background shadow-xs">
              <DeviceIcon userAgent={currentSession.userAgent} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-sm">
                  {currentSession.userAgent || "Unknown device"}
                </p>
                <span className="flex shrink-0 items-center gap-1 text-green-600 text-xs">
                  <CheckIcon className="size-3" />
                  This device
                </span>
              </div>
              <p className="mt-1 text-muted-foreground text-xs">
                {currentSession.ipAddress || "Unknown IP"} · Signed in{" "}
                {formatDate(currentSession.createdAt, "MMM d, yyyy - h:mm a")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {otherSessions.length > 0 ? (
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase">
            Other devices
          </p>
          <div className="space-y-2">
            {otherSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start gap-3 rounded-xl border p-3"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border bg-background shadow-xs">
                  <DeviceIcon userAgent={session.userAgent} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {session.userAgent || "Unknown device"}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {session.ipAddress || "Unknown IP"} · Signed in{" "}
                    {formatDate(session.createdAt, "MMM d, yyyy - h:mm a")}
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="destructive"
                  className="rounded-full"
                  aria-label="Sign out this device"
                  disabled={isRevoking}
                  onClick={() => onRevoke({ sessionId: session.id })}
                >
                  {isRevoking ? <Spinner /> : <TrashIcon />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SettingsClientPage({
  user,
  sessionId,
  hasPassword,
}: SettingsClientPageProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [name, setName] = useState(user.name);
  const [photoUrl, setPhotoUrl] = useState(user.image);
  const [profilePending, setProfilePending] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);

  const {
    data: sessions,
    isPending: sessionsPending,
    isError: sessionsError,
    refetch: refetchSessions,
  } = trpc.getActiveSessions.useQuery();

  const { mutate: revokeSession, isPending: isRevoking } =
    trpc.deleteSession.useMutation({
      onSuccess: () => {
        utils.getActiveSessions.invalidate();
        toast.add({ type: "success", title: "Session signed out" });
      },
      onError: (error) => {
        toast.add({
          type: "error",
          title: "Couldn't sign out that device",
          description: error.message,
        });
      },
    });

  const handlePhotoUploaded = async (url: string | undefined) => {
    if (!url) {
      return;
    }

    setPhotoUrl(url);

    const { error } = await authClient.updateUser({ image: url });
    if (error) {
      toast.add({
        type: "error",
        title: "Couldn't save your photo",
        description: error.message,
      });
      return;
    }

    toast.add({ type: "success", title: "Photo updated" });
    router.refresh();
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.add({ type: "error", title: "Name is required" });
      return;
    }

    setProfilePending(true);
    const { error } = await authClient.updateUser({
      name: trimmedName,
      image: photoUrl.trim() || null,
    });
    setProfilePending(false);

    if (error) {
      toast.add({
        type: "error",
        title: "Couldn't update your profile",
        description: error.message,
      });
      return;
    }

    setName(trimmedName);
    setPhotoUrl(photoUrl.trim());
    toast.add({ type: "success", title: "Profile updated" });
    router.refresh();
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.add({
        type: "error",
        title: "Password too short",
        description: "Use at least 8 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.add({
        type: "error",
        title: "Passwords don't match",
        description: "Re-type the new password and try again.",
      });
      return;
    }

    setPasswordPending(true);

    if (hasPassword) {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordPending(false);

      if (error) {
        toast.add({
          type: "error",
          title: "Couldn't change your password",
          description: error.message,
        });
        return;
      }
    } else {
      const result = await setPasswordAction(newPassword);
      setPasswordPending(false);

      if (!result.ok) {
        toast.add({
          type: "error",
          title: "Couldn't set your password",
          description: result.message,
        });
        return;
      }
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.add({
      type: "success",
      title: hasPassword ? "Password updated" : "Password set",
    });
    router.refresh();
  };

  const handleResendVerification = async () => {
    setResendPending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: user.email,
    });
    setResendPending(false);

    if (error) {
      toast.add({
        type: "error",
        title: "Couldn't send the email",
        description: error.message,
      });
      return;
    }

    toast.add({
      type: "success",
      title: "Verification email sent",
      description: "Check your inbox for the link.",
    });
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-16 sm:px-6">
      <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
        Settings
      </h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Manage your profile, password and active sessions.
      </p>

      {user.emailVerified ? null : (
        <VerifyEmailBanner
          email={user.email}
          isResending={resendPending}
          onResend={handleResendVerification}
        />
      )}

      {/* Profile */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRoundIcon className="size-4" />
            Profile
          </CardTitle>
          <CardDescription>How you appear across the store.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={photoUrl.trim() || undefined} alt="" />
                <AvatarFallback>
                  {initialsOf(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <UploadButton
                  endpoint="avatar"
                  config={{ cn: twMerge }}
                  className="items-start gap-1.5"
                  appearance={{
                    button:
                      "w-auto rounded-md border border-input px-4 text-sm font-medium text-foreground! shadow-xs bg-background! hover:bg-accent! hover:text-accent-foreground! focus-within:ring-ring! data-[state=uploading]:after:bg-primary/10!",
                    allowedContent: "text-muted-foreground!",
                  }}
                  content={{
                    button: ({ ready, isUploading, uploadProgress }) => {
                      if (isUploading) {
                        return `Uploading ${uploadProgress}%`;
                      }
                      if (!ready) {
                        return "Getting ready...";
                      }
                      return (
                        <span className="flex items-center gap-2">
                          <ImageUpIcon className="size-4" />
                          Upload photo
                        </span>
                      );
                    },
                    allowedContent: "JPG or PNG, up to 2 MB",
                  }}
                  onClientUploadComplete={(res) =>
                    handlePhotoUploaded(res[0]?.ufsUrl)
                  }
                  onUploadError={(error) => {
                    toast.add({
                      type: "error",
                      title: "Upload failed",
                      description: error.message,
                    });
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={name}
                maxLength={80}
                required
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                value={user.email}
                readOnly
                className="cursor-default bg-muted/50"
              />
            </div>

            <Button type="submit" disabled={profilePending || !name.trim()}>
              {profilePending ? <Spinner /> : null}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4" />
            {hasPassword ? "Password" : "Set a password"}
          </CardTitle>
          <CardDescription>
            {hasPassword
              ? "Change the password you sign in with."
              : "You signed in with Google. Set a password to also sign in with email and password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {hasPassword ? (
              <div className="space-y-1.5">
                <Label htmlFor="settings-current-password">
                  Current password
                </Label>
                <Input
                  id="settings-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="settings-new-password">New password</Label>
              <Input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-confirm-password">
                Confirm new password
              </Label>
              <Input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={passwordPending}>
              {passwordPending ? <Spinner /> : null}
              {hasPassword ? "Change password" : "Set password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorIcon className="size-4" />
            Active sessions
          </CardTitle>
          <CardDescription>
            Devices that are signed in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsContent
            sessions={sessions}
            isPending={sessionsPending}
            isError={sessionsError}
            currentSessionId={sessionId}
            isRevoking={isRevoking}
            onRevoke={revokeSession}
            onRetry={() => refetchSessions()}
          />
        </CardContent>
      </Card>
    </main>
  );
}
