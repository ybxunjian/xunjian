import { HardDrive, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deliverBackupFile } from "../storage/backup-file-delivery";
import type { InspectionDraft, InspectionRecord } from "../model/types";
import { readInspectionRecoveryData } from "../storage/inspection-storage";
import type { InspectionStorageError } from "../storage/inspection-storage-safety";

type Props = {
  error: InspectionStorageError;
  userId?: string;
  records: InspectionRecord[];
  unsavedDraft: InspectionDraft | null;
  onRetry: () => void;
};

export function StorageRecoveryPanel({ error, userId, records, unsavedDraft, onRetry }: Props) {
  const exportRecovery = async () => {
    try {
      let raw: Record<string, string | null> = {};
      let readable = true;
      try { raw = readInspectionRecoveryData(userId, error.originals); } catch { readable = false; }
      // Transaction originals may contain a different account: export only this owner's keys.
      const originals = Object.fromEntries(Object.entries(error.originals).filter(([key]) => key in raw));
      const content = JSON.stringify({ app: "night-inspection-recovery", schemaVersion: 1,
        exportedAt: new Date().toISOString(), readable, raw, originals, records, unsavedDraft }, null, 2);
      const file = new File([content], `云速巡检原始数据_${Date.now()}.json`, { type: "application/json" });
      if (await deliverBackupFile(file) === "cancelled") return;
      toast.success(readable ? "已导出原始数据，请妥善保存" : "已导出当前内存数据，本机存储仍无法读取");
    } catch { toast.error("导出失败，请保留当前页面并重试"); }
  };
  return (
    <Card role="alert" className="mt-5">
      <CardContent className="space-y-3 p-5">
        <HardDrive className="size-6 text-warning" aria-hidden="true" />
        <h2 className="text-title font-bold">{error.kind === "corrupt" ? "本地数据读取异常" : "本机保存暂未完成"}</h2>
        <p className="text-body leading-6 text-muted-foreground">{error.message}。已暂停巡检数据操作和同步，请勿清除浏览器数据。</p>
        {unsavedDraft && <p className="text-body text-muted-foreground">刚才的输入暂存在当前页面，关闭或刷新前请重试保存或导出。</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={onRetry}><RefreshCw size={17} />重试</Button>
          <Button variant="ghost" onClick={exportRecovery}><Upload size={17} />导出原始数据</Button>
        </div>
        <p className="text-caption leading-5 text-muted-foreground">原始数据文件用于恢复排查，不是普通历史备份。空间不足时可先释放其他站点或设备空间，再重试。</p>
      </CardContent>
    </Card>
  );
}
