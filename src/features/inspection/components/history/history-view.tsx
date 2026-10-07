import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { Check, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ViewTransition,
  VIEW_ENTER_TRANSITION,
  VIEW_EXIT_TRANSITION,
} from "@/components/ui/view-transition";
import { useStickyEdgeState } from "../../hooks/use-sticky-edge-state";
import { Card, CardContent } from "@/components/ui/card";
import { getHistoryRecordDisplay } from "../../model/history-record-display";
import type { InspectionRecord } from "../../model/types";
import { SectionHeading } from "../section-heading";
import { HistoryCalendar } from "./history-calendar";
import { BackupView, type BackupViewProps } from "./backup-view";
import { InspectionSummary } from "./inspection-summary";
import { DetailRecordActions } from "./detail-record-actions";
import { BatchDeleteControls } from "./batch-delete-controls";

type HistoryViewProps = {
  actionsContainer: HTMLDivElement | null;
  calendarOpen: boolean;
  calendarMonth: string;
  onCalendarMonthChange: (month: string) => void;
  records: InspectionRecord[];
  selectedRecord: InspectionRecord | null;
  direction: 1 | -1;
  manageHistory: boolean;
  selectedRecordIds: string[];
  reduceMotion: boolean;
  onSelectRecord: (record: InspectionRecord) => void;
  onReturnToList: () => void;
  onToggleRecord: (id: string) => void;
  onDeleteRecords: (ids: string[]) => void;
  onDeleteRecord: (record: InspectionRecord) => void;
  backupOpen: boolean;
  backupProps: BackupViewProps;
};

export function HistoryView({
  actionsContainer,
  calendarOpen,
  calendarMonth,
  onCalendarMonthChange,
  records,
  selectedRecord,
  direction,
  manageHistory,
  selectedRecordIds,
  reduceMotion,
  onSelectRecord,
  onReturnToList,
  onToggleRecord,
  onDeleteRecords,
  onDeleteRecord,
  backupOpen,
  backupProps,
}: HistoryViewProps) {
  const isPresent = useIsPresent();
  const viewKey = selectedRecord
    ? `detail-${selectedRecord.id}`
    : backupOpen ? "backup" : calendarOpen ? "calendar" : "list";
  const [readyViewKey, setReadyViewKey] = useState(viewKey);

  return (
    <>
      <ViewTransition
        viewKey={viewKey}
        direction={direction}
        reduceMotion={reduceMotion}
        onViewReady={setReadyViewKey}
      >
        {selectedRecord ? (
          <InspectionSummary record={selectedRecord} />
        ) : backupOpen ? (
          <BackupView {...backupProps} />
        ) : calendarOpen ? (
          <HistoryCalendar
            records={records}
            month={calendarMonth}
            onMonthChange={onCalendarMonthChange}
            onSelectRecord={onSelectRecord}
          />
        ) : (
          <HistoryList
            records={records}
            manageHistory={manageHistory}
            selectedRecordIds={selectedRecordIds}
            onSelectRecord={onSelectRecord}
            onToggleRecord={onToggleRecord}
            onDeleteRecords={onDeleteRecords}
            reduceMotion={reduceMotion}
          />
        )}
      </ViewTransition>
      {actionsContainer && createPortal(
        <AnimatePresence initial={false}>
          {isPresent && selectedRecord && readyViewKey === viewKey && (
            <HistoryDetailActions
              key={`actions-${selectedRecord.id}`}
              returnLabel={calendarOpen ? "返回巡检日历" : "返回历史记录"}
              reduceMotion={reduceMotion}
              onReturn={onReturnToList}
              onDelete={() => onDeleteRecord(selectedRecord)}
            />
          )}
        </AnimatePresence>,
        actionsContainer,
      )}
    </>
  );
}

function HistoryDetailActions(props: Parameters<typeof DetailRecordActions>[0]) {
  const isPresent = useIsPresent();
  const elementRef = useRef<HTMLDivElement>(null);
  const { reduceMotion } = props;

  useLayoutEffect(() => {
    if (!isPresent && document.activeElement instanceof HTMLElement && elementRef.current?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }, [isPresent]);

  return (
    <motion.div
      ref={elementRef}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 grid w-[calc(100%-2rem)] max-w-[416px] -translate-x-1/2"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: reduceMotion ? { duration: 0 } : VIEW_ENTER_TRANSITION,
      }}
      exit={{
        opacity: 0,
        y: reduceMotion ? 0 : 8,
        transition: reduceMotion ? { duration: 0 } : VIEW_EXIT_TRANSITION,
      }}
    >
      <DetailRecordActions {...props} />
    </motion.div>
  );
}

type HistoryListProps = Pick<
  HistoryViewProps,
  | "records"
  | "manageHistory"
  | "selectedRecordIds"
  | "onSelectRecord"
  | "onToggleRecord"
  | "onDeleteRecords"
  | "reduceMotion"
>;

function HistoryList({
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
    <>
      <SectionHeading title="历史记录" />
      {records.length ? (
        records.map((record) => (
          <Card className="mb-2" key={record.id}>
            <CardContent className="p-0">
              {manageHistory ? <button
                type="button"
                onClick={() => onToggleRecord(record.id)}
                aria-label={`选择 ${record.date} ${record.time} 的巡检记录`}
                aria-pressed={selectedRecordIds.includes(record.id)}
                className="flex min-h-22 w-full items-center gap-3 rounded-card p-4 text-left"
              >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${selectedRecordIds.includes(record.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    {selectedRecordIds.includes(record.id) && (
                      <Check size={14} strokeWidth={3} />
                    )}
                  </span>
                <span className="min-w-0 flex-1">
                  <RecordDate record={record} />
                </span>
              </button> : (
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
                    <span className="history-detail-entry-circle grid place-items-center rounded-full bg-background text-muted-foreground group-hover:bg-muted">
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
          <div className="pointer-events-auto flex min-h-14 items-center px-1">
            <span className="text-body font-semibold text-muted-foreground">
              已选择 <b className="text-primary">{selectedRecordIds.length}</b> 条
            </span>
            <BatchDeleteControls
              selectedRecordIds={selectedRecordIds}
              reduceMotion={reduceMotion}
              onDelete={onDeleteRecords}
            />
          </div>
        </div>
      )}
    </>
  );
}

function RecordDate({ record }: { record: InspectionRecord }) {
  const display = getHistoryRecordDisplay(record);
  return (
    <span className="history-record-info" title={`${record.date} · 填写时间 ${record.time}`}>
      <b className="history-record-date tabular-nums">{display.date}</b>
      <span className="history-record-date-caption text-label text-muted-foreground">{display.dateCaption}</span>
      <span className="history-record-separator bg-border" aria-hidden="true" />
      <span className="history-record-time text-card-title font-semibold tabular-nums text-muted-foreground">{display.time}</span>
      <span className="history-record-time-caption text-label text-subtle-foreground">{display.timeCaption}</span>
      <span className="sr-only">完整填写时间 {record.time}</span>
    </span>
  );
}
