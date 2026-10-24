import { Check, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStickyEdgeState } from "../../hooks/use-sticky-edge-state";
import { getHistoryRecordDisplay } from "../../model/history-record-display";
import type { InspectionRecord } from "../../model/types";
import { SectionHeading } from "../section-heading";
import { BatchDeleteControls } from "./batch-delete-controls";

type HistoryListProps = {
  records: InspectionRecord[];
  manageHistory: boolean;
  selectedRecordIds: string[];
  onSelectRecord: (record: InspectionRecord) => void;
  onToggleRecord: (id: string) => void;
  onDeleteRecords: (ids: string[]) => void;
  reduceMotion: boolean;
};

export function HistoryList({
  records,
  manageHistory,
  selectedRecordIds,
  onSelectRecord,
  onToggleRecord,
  onDeleteRecords,
  reduceMotion,
}: HistoryListProps) {
  const { elementRef: selectionActionsRef, isStuck } = useStickyEdgeState(
    manageHistory && records.length > 0,
  );

  return (
    <div className="history-list -mx-page px-page">
      <SectionHeading title="历史记录" />
      {records.length ? (
        records.map((record) => (
          <Card className="history-record-card mb-2" key={record.id}>
            <CardContent className="p-0">
              {manageHistory ? (
                <button
                  type="button"
                  onClick={() => onToggleRecord(record.id)}
                  aria-label={`选择 ${record.date} ${record.time} 的巡检记录`}
                  aria-pressed={selectedRecordIds.includes(record.id)}
                  className="flex min-h-22 w-full items-center gap-3 rounded-card p-4 text-left"
                >
                  <span
                    className={`history-record-selection grid size-6 shrink-0 place-items-center rounded-full border-2 ${selectedRecordIds.includes(record.id) ? "border-primary bg-primary-surface text-primary-foreground" : "border-history-selection-border bg-card"}`}
                  >
                    {selectedRecordIds.includes(record.id) && (
                      <Check size={14} strokeWidth={3} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <RecordDate record={record} />
                  </span>
                </button>
              ) : (
                <div className="flex min-h-22 w-full items-center gap-3 rounded-card p-4 text-left">
                  <span className="min-w-0 flex-1">
                    <RecordDate record={record} />
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`查看 ${record.date} ${record.time} 的巡检详情`}
                    data-history-menu-transition="exit"
                    onClick={() => onSelectRecord(record)}
                    className="group rounded-full hover:bg-transparent"
                  >
                    <span className="history-detail-entry-circle grid place-items-center rounded-full bg-history-entry-surface text-muted-foreground group-hover:bg-history-entry-hover-surface">
                      <ChevronRight size={18} />
                    </span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-control bg-muted text-primary">
              <History size={22} />
            </span>
            <p className="text-body font-medium">暂无历史记录</p>
          </CardContent>
        </Card>
      )}
      {manageHistory && records.length > 0 && (
        <div
          className={`history-selection-actions pointer-events-none sticky bottom-0 z-10 -mx-page mt-2 px-page pb-[max(1rem,env(safe-area-inset-bottom))] ${isStuck ? "history-selection-actions--stuck" : ""}`}
          ref={selectionActionsRef}
        >
          <div className="history-selection-backdrop" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="pointer-events-auto relative z-10 flex min-h-14 items-center px-1">
            <span className="text-body font-semibold text-muted-foreground">
              已选择 <b className="text-primary tabular-nums">{selectedRecordIds.length}</b> 条
            </span>
            <BatchDeleteControls
              selectedRecordIds={selectedRecordIds}
              reduceMotion={reduceMotion}
              onDelete={onDeleteRecords}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RecordDate({ record }: { record: InspectionRecord }) {
  const display = getHistoryRecordDisplay(record);
  return (
    <span className="history-record-info" title={`${record.date} · 填写时间 ${record.time}`}>
      <b className="history-record-date tabular-nums">{display.date}</b>
      <span className="history-record-date-caption tabular-nums text-label text-muted-foreground">{display.dateCaption}</span>
      <span className="history-record-separator bg-border" aria-hidden="true" />
      <span className="history-record-time text-card-title font-semibold tabular-nums text-muted-foreground">{display.time}</span>
      <span className="history-record-time-caption text-label text-subtle-foreground">{display.timeCaption}</span>
      <span className="sr-only">完整填写时间 {record.time}</span>
    </span>
  );
}
