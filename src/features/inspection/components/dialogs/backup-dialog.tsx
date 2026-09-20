import { ActionTile } from "@/components/ui/action-tile";
import { DialogHeading } from "@/components/ui/dialog-heading";
import { useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import {
  ArchiveRestore,
  CheckCircle2,
  ChevronDown,
  Download,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InspectionImportPreview } from "../../model/types";

type BackupDialogProps = {
  recordCount: number;
  lastBackupAt: string | null;
  importPreview: InspectionImportPreview | null;
  canUndoImport: boolean;
  onExport: () => void;
  onImportFile: (file: File) => void;
  onMergeImport: () => void;
  onReplaceImport: () => void;
  onCancelPreview: () => void;
  onUndoImport: () => void;
  onClose: () => void;
};

export function BackupDialog(props: BackupDialogProps) {
  return (
    <Sheet labelledBy="backup-dialog-title" onClose={props.onClose}>
      {props.importPreview ? (
        <ImportPreviewPanel {...props} />
      ) : (
        <BackupMenu {...props} />
      )}
    </Sheet>
  );
}

function BackupMenu({
  recordCount,
  lastBackupAt,
  canUndoImport,
  onExport,
  onImportFile,
  onUndoImport,
  onClose,
}: BackupDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <DialogHeading
        id="backup-dialog-title"
        truncate
        icon={<ArchiveRestore size={21} />}
        title="备份与恢复"
        description="保存备份，方便在其他设备恢复历史记录"
      />

      <div className="mt-4 space-y-2">
        <ActionTile icon={<Upload size={19} />} title="导出备份" tone="primary"
          description={recordCount > 0 ? `保存或发送 ${recordCount} 条记录` : "暂无可导出的记录"}
          disabled={recordCount === 0} onClick={onExport} />

        <ActionTile icon={<Download size={19} />} title="导入备份" description="选择 JSON 备份文件" onClick={() => inputRef.current?.click()} />
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImportFile(file);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <div className="mt-3 flex min-h-11 items-center justify-between rounded-control px-3 text-caption text-muted-foreground">
        <span>上次备份</span>
        <span>{formatDateTime(lastBackupAt) ?? "尚未备份"}</span>
      </div>

      {canUndoImport && (
        <Button
          type="button"
          variant="ghost"
          onClick={onUndoImport}
          className="w-full text-primary"
        >
          <RotateCcw size={17} />
          撤销上次恢复
        </Button>
      )}

      <Button type="button" variant="ghost" onClick={onClose} className="mt-1 w-full">
        关闭
      </Button>
    </>
  );
}

function ImportPreviewPanel({
  importPreview,
  onMergeImport,
  onReplaceImport,
  onCancelPreview,
}: BackupDialogProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const preview = importPreview!;

  return (
    <>
      <DialogHeading
        id="backup-dialog-title"
        truncate
        icon={<CheckCircle2 size={21} />}
        title="备份可以恢复"
        description={preview.fileName}
        tone="success"
      />

      <div className="mt-4 rounded-control bg-muted p-3">
        <DetailRow label="备份时间" value={formatDateTime(preview.exportedAt) ?? "旧版备份"} />
        <DetailRow label="包含记录" value={`${preview.records.length} 条`} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <CountCard label="可新增" value={preview.newRecordCount} tone="primary" />
        <CountCard label="重复跳过" value={preview.duplicateCount} />
        <CountCard label="无效跳过" value={preview.invalidCount} tone={preview.invalidCount ? "warning" : undefined} />
      </div>

      <div className="mt-4 rounded-control bg-success-soft px-3 py-2.5 text-caption leading-5 text-success">
        <ShieldCheck size={16} className="mr-1.5 inline align-[-3px]" />
        智能合并会保留当前记录，并自动跳过重复项。
      </div>

      <Button
        type="button"
        disabled={preview.newRecordCount === 0}
        onClick={onMergeImport}
        className="mt-4 w-full"
      >
        <Upload size={17} />
        {preview.newRecordCount > 0 ? `恢复 ${preview.newRecordCount} 条新记录` : "没有需要新增的记录"}
      </Button>

      <button
        type="button"
        aria-expanded={advancedOpen}
        onClick={() => {
          setAdvancedOpen((current) => !current);
          setConfirmReplace(false);
        }}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 text-caption font-semibold text-muted-foreground"
      >
        高级选项
        <ChevronDown
          size={15}
          className={`transition ${advancedOpen ? "rotate-180" : ""}`}
        />
      </button>

      {advancedOpen && (
        <div className="rounded-control bg-destructive-soft p-3">
          <p className="text-caption leading-5 text-destructive">
            替换会删除当前记录，改为备份中的 {preview.records.length} 条。恢复后可撤销一次。
          </p>
          <Button
            type="button"
            variant="destructive"
            disabled={preview.invalidCount > 0}
            onClick={() => {
              if (confirmReplace) onReplaceImport();
              else setConfirmReplace(true);
            }}
            className="mt-2 w-full"
          >
            {preview.invalidCount > 0
              ? "备份含无效记录，无法替换"
              : confirmReplace
                ? "再次点击确认替换"
                : "替换当前全部记录"}
          </Button>
        </div>
      )}

      <Button type="button" variant="ghost" onClick={onCancelPreview} className="mt-2 w-full">
        重新选择
      </Button>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 text-body">
      <span className="text-muted-foreground">{label}</span>
      <b className="text-right text-foreground">{value}</b>
    </div>
  );
}

function CountCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "warning";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";

  return (
    <div className="rounded-control border border-border/80 bg-card px-1 py-2.5 shadow-card">
      <b className={`block text-lg ${toneClass}`}>{value}</b>
      <span className="mt-0.5 block text-label text-muted-foreground">{label}</span>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
