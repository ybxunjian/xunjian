import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { DirectionalViewTransition, VIEW_EXIT_TRANSITION, VIEW_TRANSITION } from "@/components/ui/directional-view-transition";
import { getLatestHistoryDate } from "../../model/history-filter";
import type { InspectionRecord } from "../../model/types";
import { HistoryCalendar } from "./history-calendar";
import { BackupView, type BackupViewProps } from "./backup-view";
import { HistoryList } from "./history-list";
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
  onDeleteRecords: (ids: string[]) => void;
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
  onDeleteRecords,
  onDeleteRecord,
  onOpenBackup,
  onCloseBackup,
  backupOpen,
  backupProps,
}: HistoryViewProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState("");
  const isPresent = useIsPresent();
  const [pagePresence, setPagePresence] = useState({ present: isPresent, visit: 0 });
  if (pagePresence.present !== isPresent) {
    setPagePresence({
      present: isPresent,
      visit: pagePresence.visit + Number(isPresent),
    });
    if (isPresent) setCalendarOpen(false);
  }

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
        // Remove the live child before a propagated exit diffs it; retain only its exit snapshot.
        <AnimatePresence propagate={!selectedRecord}>
          {isPresent && !selectedRecord && (
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
        key={pagePresence.visit}
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
            onDeleteRecords={onDeleteRecords}
            reduceMotion={reduceMotion}
          />
        )}
      </DirectionalViewTransition>
      <AnimatePresence initial={false}>
        {selectedRecord && (
          <motion.div
            key={`actions-${selectedRecord.id}`}
            className="history-detail-actions fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 grid -translate-x-1/2"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: reduceMotion
                ? { duration: 0 }
                : VIEW_TRANSITION,
            }}
            exit={{
              opacity: 0,
              y: reduceMotion ? 0 : 8,
              transition: reduceMotion
                ? { duration: 0 }
                : VIEW_EXIT_TRANSITION,
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
