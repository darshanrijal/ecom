"use client";

import { useEffect, useRef } from "react";

export interface EsewaSubmitData {
  url: string;
  fields: Record<string, string>;
}

export function EsewaSubmitForm({ url, fields }: EsewaSubmitData) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} method="POST" action={url} className="hidden">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <noscript>
        <p className="text-muted-foreground text-xs">
          Your browser is blocking automatic redirects —{" "}
          <button type="submit" className="underline">
            continue to eSewa
          </button>
        </p>
      </noscript>
    </form>
  );
}
