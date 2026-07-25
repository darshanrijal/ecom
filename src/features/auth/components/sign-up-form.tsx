"use client";

import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export const SignUpForm = () => {
  const formSchema = z.object({
    name: z.string().min(3, "Name must be minimum 3 characters"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password should be minimum 8 characters"),
  });
  type FormValues = z.infer<typeof formSchema>;
  const [isPassword, setIsPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const router = useRouter();

  function onSubmit(values: FormValues) {
    setAuthError("");

    startTransition(async () => {
      await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        callbackURL: "/",
        fetchOptions: {
          onSuccess: () => {
            router.push("/verify-email");
          },
          onError: ({ error }) => {
            setAuthError(error.message);
          },
        },
      });
    });
  }

  function withGoogle() {
    startTransition(async () => {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {authError !== "" && (
        <p className="text-center font-medium text-destructive">{authError}</p>
      )}
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                {...field}
                id="name"
                aria-invalid={fieldState.invalid}
                placeholder="Jethalal Champaklal Gada"
                autoComplete="name"
                type="text"
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                {...field}
                id="email"
                aria-invalid={fieldState.invalid}
                placeholder="tappukepapa@mail.com"
                autoComplete="email"
                type="email"
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Input
                  {...field}
                  id="password"
                  aria-invalid={fieldState.invalid}
                  placeholder="********"
                  autoComplete="current-password"
                  className="pr-8"
                  type={isPassword ? "password" : "text"}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  title={isPassword ? "Show password" : "Hide password"}
                  onClick={() => setIsPassword(!isPassword)}
                >
                  {isPassword ? (
                    <EyeIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <EyeOffIcon className="size-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <div className="flex flex-col gap-3">
          <Button
            disabled={isPending}
            type="submit"
            className="space-x-2 bg-orange-400 hover:bg-orange-400/90"
          >
            Register
          </Button>
          <Button disabled={isPending} onClick={withGoogle} variant={"outline"}>
            <FcGoogle />
            Register with Google
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
};
