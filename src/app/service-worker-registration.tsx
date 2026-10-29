"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration({ basePath }: { basePath: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    const scope = `${basePath}/`;
    void navigator.serviceWorker
      .register(`${basePath}/sw.js`, { scope, updateViaCache: "none" })
      .catch((error: unknown) => {
        console.warn("离线资源注册失败", error);
      });
  }, [basePath]);

  return null;
}
