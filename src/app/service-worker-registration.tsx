"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { watchServiceWorkerUpdates } from "@/lib/service-worker-updates";

export function ServiceWorkerRegistration({ basePath }: { basePath: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let disposed = false;
    let stopWatching: (() => void) | undefined;
    let lastCheck = 0;
    const id = "app-update-available";
    const scope = `${basePath}/`;
    const check = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      void navigator.serviceWorker.getRegistration(scope).then(registration => registration?.update()).catch(() => {});
    };
    void navigator.serviceWorker.register(`${basePath}/sw.js`, { scope, updateViaCache: "none" })
      .then(registration => {
        if (disposed) return;
        stopWatching = watchServiceWorkerUpdates(registration, navigator.serviceWorker, {
          available: apply => toast("发现新版本", { id, duration: Infinity,
            description: "点击更新前会检查本机数据是否已保存。", action: { label: "更新", onClick: apply } }),
          blocked: () => toast.error("暂时无法安全更新", { id, duration: Infinity,
            description: "请先处理本机存储问题并重试，再刷新页面。" }),
          failed: () => toast.error("更新暂未完成", { id, description: "请稍后重新打开页面重试。" }),
          reload: () => window.location.reload(),
        });
      }).catch((error: unknown) => console.warn("离线资源注册失败", error));
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      disposed = true;
      stopWatching?.();
      toast.dismiss(id);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [basePath]);
  return null;
}
