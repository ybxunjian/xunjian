import type { ReactNode } from "react";

export function CredentialHeading({ title, description, id, level = "h1" }: {
  title: string; description: ReactNode; id?: string; level?: "h1" | "h3";
}) {
  const Heading = level;
  return (
    <div className="text-center">
      <Heading id={id} className="text-title font-black tracking-tight text-foreground-strong">{title}</Heading>
      <p className="mt-3 text-base tracking-wide text-muted-foreground">{description}</p>
    </div>
  );
}
