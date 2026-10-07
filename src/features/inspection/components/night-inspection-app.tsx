"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Cloud,
  CloudOff,
  LoaderCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ViewTransition } from "@/components/ui/view-transition";
import {
  AccountDialog,
  AvatarVisual,
  useUserPreferences,
} from "@/features/account";
import { AuthScreen, useAuth } from "@/features/auth";
import {
  useInspectionController,
  type InspectionSyncStatus,
} from "../hooks/use-inspection-controller";
import type { InspectionTab } from "../model/types";
import { getLatestHistoryDate } from "../model/history-filter";
import { BeltArea } from "./belt/belt-area";
import { SaveValidationDialog } from "./dialogs/save-validation-dialog";
import { HistoryView } from "./history/history-view";
import { HistoryQuickMenu } from "./history/history-quick-menu";
import { InspectionTabs } from "./inspection-tabs";
import { PumpArea } from "./pump/pump-area";

export function NightInspectionApp() {
  const auth = useAuth();
  const account = auth.user ?? auth.offlineIdentity;

  if (auth.status === "loading") {
    return (
      <main className="mx-auto flex min-h-svh max-w-md items-center justify-center bg-background text-muted-foreground">
        <LoaderCircle className="size-7 animate-spin" aria-label="正在检查登录状态" />
      </main>
    );
  }

  if (
    auth.configured &&
    (auth.status === "signed-out" || auth.status === "password-recovery")
  ) {
    return (
      <AuthScreen
        key={auth.status}
        passwordRecovery={auth.status === "password-recovery"}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onResendSignUpConfirmation={auth.resendSignUpConfirmation}
        onRequestPasswordReset={auth.requestPasswordReset}
        onUpdatePassword={auth.updatePassword}
      />
    );
  }

  return (
    <InspectionAppContent
      key={account?.id ?? "local"}
      userId={account?.id}
      email={account?.email}
      emailVerified={Boolean(account?.email_confirmed_at)}
      onChangePassword={auth.user ? auth.changePassword : undefined}
      onSignOut={auth.user ? auth.signOut : undefined}
    />
  );
}

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

function InspectionAppContent({
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
  const [historyActionsContainer, setHistoryActionsContainer] = useState<HTMLDivElement | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState("");
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
    if (nextTab !== "history") {
      actions.closeBackup();
      setCalendarOpen(false);
      setCalendarMonth("");
    }
    actions.selectTab(nextTab);
  };

  const openCalendar = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const latest = getLatestHistoryDate(state.records) ?? today;
    setCalendarMonth(latest.slice(0, 7));
    actions.setHistoryDirection(1);
    setCalendarOpen(true);
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

  const content =
    state.tab === "slag8" ? (
      <PumpArea
        area="slag8"
        values={state.values}
        onValueChange={actions.updateValue}
        onSelectPump={actions.choosePump}
        onClearPump={actions.clearPump}
      />
    ) : state.tab === "slag9" ? (
      <PumpArea
        area="slag9"
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
        actionsContainer={historyActionsContainer}
        calendarOpen={calendarOpen}
        calendarMonth={calendarMonth}
        onCalendarMonthChange={setCalendarMonth}
        records={state.records}
        selectedRecord={state.selectedRecord}
        direction={state.historyDirection}
        manageHistory={state.manageHistory}
        selectedRecordIds={state.selectedRecordIds}
        reduceMotion={Boolean(reduceMotion)}
        onSelectRecord={actions.selectRecord}
        onReturnToList={actions.returnToHistoryList}
        onToggleRecord={actions.toggleRecord}
        onDeleteRecords={actions.deleteRecords}
        onDeleteRecord={(record) => actions.deleteRecords([record.id])}
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
      <header className="rounded-sheet bg-gradient-to-br from-header-start via-header-middle to-header-end p-5 text-primary-foreground shadow-floating ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight">夜班巡检</h1>
          </div>
          {onSignOut && onChangePassword && email && (
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              aria-label="打开账号"
              title="账号"
              className="size-11 shrink-0 rounded-full bg-border text-sm font-black text-muted-foreground shadow-card ring-1 ring-white/70 transition active:scale-[.97]"
            >
              <AvatarVisual email={email} avatarUrl={preferences.avatarUrl} tone="header" />
            </button>
          )}
        </div>
        <p className="mt-1 text-body text-header-muted">
          把每一次巡检，清晰留在当下。
        </p>
        {userId && (
          <button
            type="button"
            onClick={() => void actions.syncNow()}
            disabled={state.syncStatus === "syncing"}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-white/10 px-3 text-caption font-bold text-header-muted transition hover:bg-white/15 disabled:opacity-70"
          >
            <SyncIcon status={state.syncStatus} />
            {syncStatusLabel(
              state.syncStatus,
              state.pendingSyncCount,
              state.lastSyncedAt,
            )}
          </button>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="inverse" onClick={actions.createNewInspection}>
            新建
          </Button>
          <Button onClick={actions.save}>
            <Save />
            保存
          </Button>
        </div>
      </header>

      <InspectionTabs
        order={preferences.navigationOrder}
        value={state.tab}
        onChange={selectTab}
      />

      <div className="relative">
        <div className="absolute right-[calc(1rem+1px)] top-0 z-10">
          <AnimatePresence>
            {state.tab === "history" && !state.selectedRecord && (
              <HistoryQuickMenu
                key="history-menu"
                recordCount={state.records.length}
                reduceMotion={Boolean(reduceMotion)}
                manageHistory={state.manageHistory}
                showBack={calendarOpen || state.backupOpen}
                onCalendar={openCalendar}
                onBatchDelete={actions.toggleHistoryManagement}
                onBackup={actions.openBackup}
                onDone={actions.toggleHistoryManagement}
                onBack={() => {
                  actions.setHistoryDirection(-1);
                  if (state.backupOpen) actions.closeBackup();
                  else setCalendarOpen(false);
                }}
              />
            )}
          </AnimatePresence>
        </div>
        <ViewTransition viewKey={state.tab} reduceMotion={Boolean(reduceMotion)}>
          {content}
        </ViewTransition>
        <div ref={setHistoryActionsContainer} />
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
