import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DirectionalViewTransition, VIEW_TRANSITION } from "@/components/ui/directional-view-transition";
import { useStickyEdgeState } from "../../hooks/use-sticky-edge-state";
import { Card, CardContent } from "@/components/ui/card";
import { getLatestHistoryDate } from "../../model/history-filter";
import { getHistoryRecordDisplay } from "../../model/history-record-display";
import type { DeleteRequest, InspectionRecord } from "../../model/types";
import { SectionHeading } from "../section-heading";
import { HistoryCalendar } from "./history-calendar";
import { BackupView, type BackupViewProps } from "./backup-view";
import { HistoryQuickMenu } from "./history-quick-menu";
import { InspectionSummary } from "./inspection-summary";
import { DetailRecordActions } from "./detail-record-actions";

type HistoryViewProps = {
  menuContainer: HTMLDivElement | null;
  records: InspectionRecord[];
  selectedRecord: InspectionRecord | null;
  direction: 1 | -1;
  onDirectionChange: (direction: 1 | -1) => void;
  manageHistory: boolean;
  selectedRecordIds: string[];
  reduceMotion: boolean;
  onSelectRecord: (record: InspectionRecord) => void;
  onReturnToList: () => void;
  onToggleManage: () => void;
  onToggleRecord: (id: string) => void;
  onDeleteRequest: (request: DeleteRequest) => void;
  onDeleteRecord: (record: InspectionRecord) => void;
  onOpenBackup: () => void;
  onCloseBackup: () => void;
  backupOpen: boolean;
  backupProps: BackupViewProps;
};

export function HistoryView({
  menuContainer,
  records,
  selectedRecord,
  direction,
  onDirectionChange,
  manageHistory,
  selectedRecordIds,
  reduceMotion,
  onSelectRecord,
  onReturnToList,
  onToggleManage,
  onToggleRecord,
  onDeleteRequest,
  onDeleteRecord,
  onOpenBackup,
  onCloseBackup,
  backupOpen,
  backupProps,
}: HistoryViewProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState("");

  const openCalendar = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const latest = getLatestHistoryDate(records) ?? today;
    setCalendarMonth(latest.slice(0, 7));
    onDirectionChange(1);
    setCalendarOpen(true);
  };

  return (
    <>
      {menuContainer && createPortal(
        // An empty propagated presence cannot finish the parent tab's exit.
        <AnimatePresence propagate={!selectedRecord}>
          {!selectedRecord && (
            <HistoryQuickMenu
              key="history-menu"
              recordCount={records.length}
              reduceMotion={reduceMotion}
              manageHistory={manageHistory}
              showBack={calendarOpen || backupOpen}
              onCalendar={openCalendar}
              onBatchDelete={onToggleManage}
              onBackup={onOpenBackup}
              onDone={onToggleManage}
              onBack={() => {
                onDirectionChange(-1);
                if (backupOpen) onCloseBackup();
                else setCalendarOpen(false);
              }}
            />
          )}
        </AnimatePresence>,
        menuContainer,
      )}
      <DirectionalViewTransition
        viewKey={selectedRecord ? `detail-${selectedRecord.id}` : backupOpen ? "backup" : calendarOpen ? "calendar" : "list"}
        direction={direction}
        reduceMotion={reduceMotion}
      >
          {selectedRecord ? (
            <InspectionSummary record={selectedRecord} />
          ) : backupOpen ? (
            <BackupView {...backupProps} />
          ) : calendarOpen ? (
            <HistoryCalendar
              records={records}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelectRecord={onSelectRecord}
            />
          ) : (
            <HistoryList
              records={records}
              manageHistory={manageHistory}
              selectedRecordIds={selectedRecordIds}
              onSelectRecord={onSelectRecord}
              onToggleRecord={onToggleRecord}
              onDeleteRequest={onDeleteRequest}
            />
          )}
      </DirectionalViewTransition>
      <AnimatePresence initial={false}>
        {selectedRecord && (
          <motion.div
            key={`actions-${selectedRecord.id}`}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 grid w-[calc(100%-2rem)] max-w-[416px] -translate-x-1/2"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: reduceMotion
                ? { duration: 0 }
                : {
                  ...VIEW_TRANSITION,
                  delay: VIEW_TRANSITION.duration,
                },
            }}
            exit={{
              opacity: 0,
              y: reduceMotion ? 0 : 8,
              transition: reduceMotion
                ? { duration: 0 }
                : VIEW_TRANSITION,
            }}
          >
            <DetailRecordActions
              returnLabel={calendarOpen ? "返回巡检日历" : "返回历史记录"}
              reduceMotion={reduceMotion}
              onReturn={onReturnToList}
              onDelete={() => onDeleteRecord(selectedRecord)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type HistoryListProps = Pick<
  HistoryViewProps,
  | "records"
  | "manageHistory"
  | "selectedRecordIds"
  | "onSelectRecord"
  | "onToggleRecord"
  | "onDeleteRequest"
>;

function HistoryList({
  records,
  manageHistory,
  selectedRecordIds,
  onSelectRecord,
  onToggleRecord,
  onDeleteRequest,
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
            <Button
              type="button"
              variant="destructive"
              disabled={selectedRecordIds.length === 0}
              onClick={() =>
                onDeleteRequest({
                  ids: selectedRecordIds,
                  label: `${selectedRecordIds.length} 条历史记录`,
                })
              }
              className="ml-auto rounded-full px-3"
            >
              <Trash2 size={16} />
              删除
            </Button>
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
