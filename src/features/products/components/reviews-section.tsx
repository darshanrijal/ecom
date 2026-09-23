"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  MessageSquareOffIcon,
  PenLineIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type z from "zod";

import { type RouterOutputs, trpc } from "@/__rpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { reviewBodySchema } from "@/lib/review-schema";
import { cn } from "@/lib/utils";
import { StarRating } from "./star-rating";

type ReviewList = NonNullable<RouterOutputs["reviews"]["list"]>;
type ReviewItem = ReviewList["reviews"][number];
type ReviewSummary = ReviewList["summary"];

type ReviewFormValues = z.infer<typeof reviewBodySchema>;

const AVATAR_COLORS = [
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
];

export function ProductRatingSummary({ productId }: { productId: string }) {
  const { data, isPending } = trpc.reviews.list.useQuery({ productId });

  if (isPending || !data) {
    return null;
  }

  const { count, average } = data.summary;

  if (count === 0) {
    return (
      <Link
        href="#reviews"
        className="text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        No reviews yet · be the first
      </Link>
    );
  }

  return (
    <Link
      href="#reviews"
      className="group inline-flex items-center gap-1.5 text-sm"
    >
      <StarRating rating={average} />
      <span className="font-medium tabular-nums">{average.toFixed(1)}</span>
      <span className="text-muted-foreground transition-colors group-hover:text-foreground">
        ({count})
      </span>
    </Link>
  );
}

function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <div className="flex w-fit items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
          aria-pressed={value === star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(star)}
          onBlur={() => setHovered(null)}
          onClick={() => onChange(star)}
          className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StarIcon
            className={cn(
              "size-6 transition-colors",
              star <= active
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  isMine,
}: {
  review: ReviewItem;
  isMine: boolean;
}) {
  const initial = review.user.name.trim().charAt(0).toUpperCase() || "?";
  const avatarColor =
    AVATAR_COLORS[review.userId.charCodeAt(0) % AVATAR_COLORS.length];
  const wasEdited = review.updatedAt.getTime() !== review.createdAt.getTime();

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-xs",
        isMine && "border-primary/40 ring-1 ring-primary/20"
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full font-semibold text-sm",
              avatarColor
            )}
          >
            {initial}
          </span>

          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium text-sm">
              <span className="truncate">{review.user.name}</span>
              {!!isMine && (
                <Badge variant="secondary" className="text-[10px]">
                  Your review
                </Badge>
              )}
            </p>

            <p className="text-muted-foreground text-xs">
              {format(new Date(review.createdAt), "d MMM yyyy")}
              {wasEdited && " · edited"}
            </p>
          </div>
        </div>

        <StarRating
          rating={review.rating}
          size="sm"
          className="mt-1 shrink-0"
        />
      </header>

      {!!review.comment && (
        <p className="mt-3 text-muted-foreground text-sm leading-7">
          {review.comment}
        </p>
      )}
    </article>
  );
}

function ReviewSummaryCard({ summary }: { summary: ReviewSummary }) {
  if (summary.count === 0) {
    return (
      <aside className="h-fit rounded-2xl border bg-card p-5 shadow-xs">
        <div className="py-3 text-center">
          <StarRating
            rating={0}
            size="lg"
            className="mx-auto w-fit opacity-60"
          />
          <p className="mt-3 font-medium">No reviews yet</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Be the first to share your experience.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-center gap-4">
        <span className="font-bold text-4xl tabular-nums tracking-tight">
          {summary.average.toFixed(1)}
        </span>

        <div className="flex flex-col gap-1.5">
          <StarRating rating={summary.average} size="md" />
          <span className="text-muted-foreground text-xs">
            Based on {summary.count}{" "}
            {summary.count === 1 ? "review" : "reviews"}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {summary.distribution.map(({ star, count }) => (
          <div key={star} className="flex items-center gap-2.5 text-xs">
            <span className="w-7 shrink-0 text-muted-foreground tabular-nums">
              {star} ★
            </span>

            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{
                  width: `${summary.count ? (count / summary.count) * 100 : 0}%`,
                }}
              />
            </div>

            <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">
              {count}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function SignInCard() {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-6 text-center shadow-xs">
      <h3 className="font-semibold text-lg">Share your experience</h3>
      <p className="mx-auto mt-1.5 max-w-md text-muted-foreground text-sm leading-6">
        Sign in to rate this product and tell other shoppers what you think.
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button nativeButton={false} render={<Link href="/sign-in" />}>
          Sign in
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/sign-up" />}
        >
          Create account
        </Button>
      </div>
    </div>
  );
}

function WriteReviewCard({
  productId,
  myReview,
}: {
  productId: string;
  myReview?: ReviewItem;
}) {
  const utils = trpc.useUtils();
  const createReview = trpc.reviews.create.useMutation();
  const deleteReview = trpc.reviews.delete.useMutation();

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewBodySchema),
    defaultValues: { rating: 0, comment: "" },
  });

  const prefilledWith = useRef<string | null>(null);
  useEffect(() => {
    if (myReview && prefilledWith.current !== myReview.id) {
      prefilledWith.current = myReview.id;
      form.reset({ rating: myReview.rating, comment: myReview.comment ?? "" });
      return;
    }

    if (!myReview && prefilledWith.current) {
      prefilledWith.current = null;
      form.reset({ rating: 0, comment: "" });
    }
  }, [myReview, form]);

  async function onSubmit(values: ReviewFormValues) {
    try {
      const wasEditing = !!myReview;
      await createReview.mutateAsync({ productId, ...values });
      await utils.reviews.list.invalidate({ productId });

      toast.add({
        type: "success",
        title: wasEditing ? "Review updated" : "Review published",
        description: wasEditing
          ? "Thanks for keeping your feedback current."
          : "Thanks for sharing your experience!",
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Couldn't save your review",
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    }
  }

  async function onDeleteReview() {
    if (!myReview) {
      return;
    }

    try {
      await deleteReview.mutateAsync({ reviewId: myReview.id });
      await utils.reviews.list.invalidate({ productId });

      toast.add({
        type: "success",
        title: "Review removed",
        description: "You can write a new one any time.",
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Couldn't remove your review",
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-lg">
          <PenLineIcon className="size-4 text-muted-foreground" />
          {myReview ? "Edit your review" : "Write a review"}
        </h3>

        {!!myReview && (
          <button
            type="button"
            onClick={() => onDeleteReview()}
            disabled={deleteReview.isPending}
            className="inline-flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-destructive disabled:opacity-50"
          >
            <Trash2Icon className="size-3.5" />
            Remove
          </button>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-4">
        <FieldGroup>
          <Controller
            name="rating"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="review-rating">Your rating</FieldLabel>
                <div id="review-rating">
                  <StarInput value={field.value} onChange={field.onChange} />
                </div>
                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="comment"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="review-comment">
                  Your review{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <Textarea
                  {...field}
                  id="review-comment"
                  rows={4}
                  maxLength={2000}
                  aria-invalid={fieldState.invalid}
                  placeholder="What did you like or dislike? How has it been performing?"
                />
                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {myReview
              ? "Submitting updates your existing review."
              : "Only signed-in customers can post reviews."}
          </p>

          <Button type="submit" disabled={createReview.isPending}>
            {createReview.isPending ? (
              <Spinner />
            ) : (
              <StarIcon className="size-4" />
            )}
            {myReview ? "Update review" : "Publish review"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function WriteArea({
  productId,
  myReview,
  isSessionPending,
  isAuthed,
}: {
  productId: string;
  myReview?: ReviewItem;
  isSessionPending: boolean;
  isAuthed: boolean;
}) {
  if (isSessionPending) {
    return <Skeleton className="h-72 rounded-2xl" />;
  }

  if (!isAuthed) {
    return <SignInCard />;
  }

  return <WriteReviewCard productId={productId} myReview={myReview} />;
}

export function ReviewsSection({ productId }: { productId: string }) {
  const session = authClient.useSession();
  const { data, isPending, isError, refetch } = trpc.reviews.list.useQuery({
    productId,
  });

  const heading = (
    <h2 className="font-semibold text-xl tracking-tight sm:text-2xl">
      Ratings &amp; reviews
    </h2>
  );

  if (isPending || !data) {
    return (
      <section id="reviews" className="mt-12 scroll-mt-24 sm:mt-16">
        {heading}
        <div className="mt-5 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section id="reviews" className="mt-12 scroll-mt-24 sm:mt-16">
        {heading}
        <div className="mt-5 rounded-2xl border border-dashed p-8 text-center">
          <p className="font-medium">We couldn&apos;t load the reviews.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const { summary, reviews } = data;
  const userId = session.data?.user.id;
  const myReview = reviews.find((review) => review.userId === userId);

  return (
    <section id="reviews" className="mt-12 scroll-mt-24 sm:mt-16">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        {heading}

        {summary.count > 0 && (
          <span className="text-muted-foreground text-sm">
            {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </span>
        )}
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ReviewSummaryCard summary={summary} />

        <div className="flex min-w-0 flex-col gap-6">
          <WriteArea
            productId={productId}
            myReview={myReview}
            isSessionPending={session.isPending}
            isAuthed={!!session.data?.user}
          />

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              <MessageSquareOffIcon className="mx-auto size-6" />
              <p className="mt-3 font-medium text-foreground">No reviews yet</p>
              <p className="mt-1 text-sm">
                Reviews from customers will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isMine={review.userId === userId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
