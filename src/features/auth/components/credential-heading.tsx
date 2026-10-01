import type { ReactNode } from "react";

export function CredentialHeading({ title, description }: {
  title: string; description: ReactNode;
}) {
  return (
    <div className="text-center">
      <h1 className="text-title font-black tracking-tight text-foreground-strong">{title}</h1>
      <p className="mt-[var(--space-auth-description)] text-base tracking-wide text-muted-foreground">{description}</p>
    </div>
  );
}
