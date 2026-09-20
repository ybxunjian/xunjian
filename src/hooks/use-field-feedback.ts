"use client";

import { useState } from "react";

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

/** Each failed submission restarts animation only for invalid fields. */
export function useFieldFeedback<Field extends string>() {
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [shakeKeys, setShakeKeys] = useState<Partial<Record<Field, number>>>({});

  function report(next: FieldErrors<Field>) {
    setErrors(next);
    setShakeKeys((previous) => {
      const keys = { ...previous };
      for (const field of Object.keys(next) as Field[]) {
        if (next[field]) keys[field] = (keys[field] ?? 0) + 1;
      }
      return keys;
    });
    return Object.values(next).some(Boolean);
  }

  function clear(field: Field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return { errors, shakeKeys, report, clear, reset: () => setErrors({}) };
}
