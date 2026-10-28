"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, useIsPresent, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { AccountDialog, useUserPreferences } from "@/features/account";
import { useInspectionController } from "../hooks/use-inspection-controller";
import type { InspectionTab } from "../model/types";
import { BeltArea } from "./belt/belt-area";
import { SaveValidationDialog } from "./dialogs/save-validation-dialog";
import { HistoryView } from "./history/history-view";
import { InspectionHeader } from "./inspection-header";
import { InspectionTabs } from "./inspection-tabs";
import { StorageRecoveryPanel } from "./storage-recovery-panel";
import { PumpArea } from "./pump/pump-area";

type InspectionAppContentProps = {
  userId?: string;
  email?: string;
  emailVerified: boolean;
  onChangePassword?: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  onSignOut?: () => Promise<void>;
};

export function InspectionAppContent({
  userId,
  email,
  emailVerified,
  onChangePassword,
  onSignOut,
}: InspectionAppContentProps) {
  const reduceMotion = useReducedMotion();
  const { state, actions } = useInspectionController(userId);
  const preferences = useUserPreferences(userId);
  const [accountOpen, setAccountOpen] = useState(false);
  const [historyMenuContainer, setHistoryMenuContainer] = useState<HTMLDivElement | null>(null);
  const startupTabApplied = useRef(false);

  useEffect(() => {
    if (!preferences.ready || startupTabApplied.current) return;
    startupTabApplied.current = true;
    actions.selectTab(preferences.navigationOrder[0]);
  }, [actions, preferences.navigationOrder, preferences.ready]);

  const selectTab = (nextTab: InspectionTab) => {
    // A choice made while preferences are loading must win over the delayed
    // startup default applied when synchronization finishes.
    startupTabApplied.current = true;
    if (nextTab !== "history") actions.closeBackup();
    actions.selectTab(nextTab);
  };

  const signOut = async () => {
    if (!onSignOut) return;
    try {
      await onSignOut();
      setAccountOpen(false);
      toast.success("已退出登录");
    } catch {
      toast.error("退出失败，请稍后重试");
    }
  };

  if (state.storageError || !state.draftReady) {
    return (
      <main className="mx-auto min-h-svh max-w-md bg-background px-page py-5">
        <h1 className="text-3xl font-black">云速巡检</h1>
        {state.storageError ? <StorageRecoveryPanel error={state.storageError} userId={userId}
          records={state.records} unsavedDraft={state.unsavedDraft} onRetry={actions.retryStorage} />
          : <p role="status" className="mt-4 text-body text-muted-foreground">正在读取本机数据…</p>}
      </main>
    );
  }

  const content =
    state.tab === "slag8" || state.tab === "slag9" ? (
      <PumpArea
        area={state.tab}
        values={state.values}
        onValueChange={actions.updateValue}
        onSelectPump={actions.choosePump}
        onClearPump={actions.clearPump}
      />
    ) : state.tab === "belt" ? (
      <BeltArea
        beltTab={state.beltTab}
        values={state.values}
        onSelectBelt={actions.setBeltTab}
        onValueChange={actions.updateValue}
        onClearItem={actions.clearBeltItem}
      />
    ) : (
      <HistoryView
        menuContainer={historyMenuContainer}
        records={state.records}
        selectedRecord={state.selectedRecord}
        direction={state.historyDirection}
        onDirectionChange={actions.setHistoryDirection}
        manageHistory={state.manageHistory}
        selectedRecordIds={state.selectedRecordIds}
        reduceMotion={Boolean(reduceMotion)}
        onSelectRecord={actions.selectRecord}
        onReturnToList={actions.returnToHistoryList}
        onToggleManage={actions.toggleHistoryManagement}
        onToggleRecord={actions.toggleRecord}
        onDeleteRecords={actions.deleteRecords}
        onDeleteRecord={(record) => actions.deleteRecords([record.id])}
        onOpenBackup={actions.openBackup}
        onCloseBackup={actions.closeBackup}
        backupOpen={state.backupOpen}
        backupProps={{
          recordCount: state.records.length,
          lastBackupAt: state.lastBackupAt,
          importPreview: state.importPreview,
          canUndoImport: state.canUndoImport,
          onExport: actions.exportBackup,
          onImportFile: actions.previewImportFile,
          onMergeImport: actions.mergeImport,
          onReplaceImport: actions.replaceImport,
          onCancelPreview: actions.cancelImportPreview,
          onUndoImport: actions.undoImport,
        }}
      />
    );

  return (
    <main className="mx-auto min-h-svh max-w-md bg-background px-page pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <InspectionHeader
        email={email}
        avatarUrl={preferences.avatarUrl}
        onOpenAccount={onSignOut && onChangePassword ? () => setAccountOpen(true) : undefined}
        syncEnabled={Boolean(userId)}
        syncStatus={state.syncStatus}
        pendingSyncCount={state.pendingSyncCount}
        lastSyncedAt={state.lastSyncedAt}
        onSync={() => void actions.syncNow()}
        onNewInspection={actions.createNewInspection}
        onSave={actions.save}
      />

      <InspectionTabs
        order={preferences.navigationOrder}
        value={state.tab}
        onChange={selectTab}
      />

      <div className="relative">
        <div
          ref={setHistoryMenuContainer}
          className="absolute right-[calc(1rem+1px)] top-0 z-10"
        />
        <AnimatePresence initial={false} mode="sync">
          <InspectionPageContent key={state.tab}>{content}</InspectionPageContent>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {state.saveValidation && (
          <SaveValidationDialog
            validation={state.saveValidation}
            onSave={actions.commitSave}
            onCancel={actions.cancelSaveValidation}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {accountOpen && onChangePassword && onSignOut && email && (
          <AccountDialog
            email={email}
            emailVerified={emailVerified}
            avatarUrl={preferences.avatarUrl}
            avatarBusy={preferences.avatarBusy}
            navigationOrder={preferences.navigationOrder}
            onAvatarChange={preferences.setAvatar}
            onAvatarRemove={preferences.removeAvatar}
            onNavigationOrderChange={preferences.setNavigationOrder}
            onChangePassword={onChangePassword}
            onSignOut={signOut}
            onClose={() => setAccountOpen(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/** Hide outgoing content immediately while its portalled menu finishes exiting. */
function InspectionPageContent({ children }: { children: ReactNode }) {
  const isPresent = useIsPresent();
  return <div hidden={!isPresent} inert={!isPresent}>{children}</div>;
}
