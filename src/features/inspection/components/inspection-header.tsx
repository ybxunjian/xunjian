import { Cloud, CloudOff, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarVisual } from "@/features/account";
import type { InspectionSyncStatus } from "../model/types";

type InspectionHeaderProps = {
  email?: string;
  avatarUrl: string | null;
  onOpenAccount?: () => void;
  syncEnabled: boolean;
  syncStatus: InspectionSyncStatus;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  onSync: () => void;
  onNewInspection: () => void;
  onSave: () => void;
};

/** Present account access, sync status and inspection actions supplied by the app. */
export function InspectionHeader({
  email, avatarUrl, onOpenAccount, syncEnabled, syncStatus,
  pendingSyncCount, lastSyncedAt, onSync, onNewInspection, onSave,
}: InspectionHeaderProps) {
  return (
    <header className="rounded-sheet bg-gradient-to-br from-header-start via-header-middle to-header-end p-5 text-primary-foreground shadow-floating ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight">云速巡检</h1>
        </div>
        {onOpenAccount && email && (
          <button
            type="button"
            onClick={onOpenAccount}
            aria-label="打开账号"
            title="账号"
            className="size-11 shrink-0 rounded-full bg-border text-sm font-black text-muted-foreground shadow-card ring-1 ring-white/70 transition active:scale-[.97]"
          >
            <AvatarVisual email={email} avatarUrl={avatarUrl} tone="header" />
          </button>
        )}
      </div>
      <p className="mt-1 text-body text-header-muted">
        把每一次巡检，清晰留在当下。
      </p>
      {syncEnabled && (
        <button
          type="button"
          onClick={onSync}
          disabled={syncStatus === "syncing"}
          className="mt-4 flex min-h-11 w-full tabular-nums items-center justify-center gap-2 rounded-control bg-white/10 px-3 text-caption font-bold text-header-muted transition hover:bg-white/15 disabled:opacity-70"
        >
          <SyncIcon status={syncStatus} />
          {syncStatusLabel(
            syncStatus,
            pendingSyncCount,
            lastSyncedAt,
          )}
        </button>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="inverse" onClick={onNewInspection}>
          新建
        </Button>
        <Button onClick={onSave}>
          <Save />
          保存
        </Button>
      </div>
    </header>
  );
}

function SyncIcon({ status }: { status: InspectionSyncStatus }) {
  if (status === "syncing") return <RefreshCw className="size-4 animate-spin" />;
  if (status === "offline" || status === "error") {
    return <CloudOff className="size-4" />;
  }
  return <Cloud className="size-4" />;
}

function syncStatusLabel(
  status: InspectionSyncStatus,
  pendingCount: number,
  lastSyncedAt: string | null,
) {
  if (status === "syncing") return "正在同步";
  if (status === "offline") {
    return pendingCount > 0
      ? `离线使用中 · 待同步 ${pendingCount} 项`
      : "离线使用中";
  }
  if (status === "error") {
    return pendingCount > 0
      ? `同步暂未完成 · 待同步 ${pendingCount} 项`
      : "同步暂未完成 · 点此重试";
  }
  if (status === "synced") {
    return lastSyncedAt ? `已同步 · ${formatSyncTime(lastSyncedAt)}` : "已同步";
  }
  return "仅保存在本机";
}

function formatSyncTime(value: string) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "刚刚";
  return time.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

