/** Minimal structural view of a zod error's issues. */
interface IssueLike {
  path?: PropertyKey[];
  message: string;
}

/**
 * Picks validation issues for the given field keys into a per-field record
 * suitable for rendering under form inputs.
 */
export function collectFieldErrors<T extends string>(
  error: { issues: readonly IssueLike[] },
  keys: readonly T[]
): Partial<Record<T, string>> {
  const errors: Partial<Record<T, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path?.[0] ?? "");
    if ((keys as readonly string[]).includes(key)) {
      errors[key as T] = issue.message;
    }
  }
  return errors;
}
