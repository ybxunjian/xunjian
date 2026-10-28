"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { registerReloadGuard } from "@/lib/page-reload-guard";
import { storageFailure as toStorageFailure, InspectionStorageError } from "../storage/inspection-storage-safety";
import { createNextDraftUpdatedAt } from "../model/draft-reconciliation";
import type {
  BeltId,
  InspectionDraft,
  InspectionRecord,
  InspectionSyncStatus,
  InspectionTab,
  InspectionValues,
  VersionedInspectionDraft,
} from "../model/types";
import {
  clearInspectionDraft,
  getStoredInspectionDraft,
  loadInspectionState,
  prepareStorageForUser,
  saveInspectionDraft,
  saveInspectionRecords,
} from "../storage/inspection-storage";
import {
  getPendingInspectionSyncCount,
  pushInspectionDraft,
  syncInspectionAccount,
} from "../sync/inspection-cloud-sync";
import { useInspectionDraftActions } from "./use-inspection-draft-actions";
import { useInspectionBackup } from "./use-inspection-backup";
import { useInspectionHistory } from "./use-inspection-history";
import { useInspectionSyncEvents } from "./use-inspection-sync-events";

type PendingDraftUpload = {
  draft: VersionedInspectionDraft;
  revision: number;
};

export function useInspectionController(userId?: string) {
  const [tab, setTab] = useState<InspectionTab>("slag8");
  const [beltTab, setBeltTab] = useState<BeltId>("SZ101");
  const [values, setValues] = useState<InspectionValues>({});
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [draftReady, setDraftReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<InspectionSyncStatus>(
    userId ? "syncing" : "local",
  );
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const syncInFlight = useRef(false);
  const syncNowRef = useRef<(background?: boolean) => Promise<void>>(async () => undefined);
  const syncRerunRequested = useRef(false);
  const recordsRevision = useRef(0);
  const retryAttempt = useRef(0);
  const draftRevision = useRef(0);
  const confirmedDraftRevision = useRef(0);
  const draftSnapshot = useRef<InspectionDraft | null>(null);
  const [pendingDraftUpload, setPendingDraftUpload] =
    useState<PendingDraftUpload | null>(null);

  const [storageError, setStorageError] = useState<InspectionStorageError | null>(null);
  const storageBlocked = useRef(false);
  const [unsavedDraft, setUnsavedDraft] = useState<VersionedInspectionDraft | null>(null);
  const reportStorageError = useCallback((error: unknown) => {
    storageBlocked.current = true;
    const failure = toStorageFailure(error);
    setStorageError(previous => new InspectionStorageError(failure.kind, failure.keys,
      { ...failure.originals, ...previous?.originals }));
  }, []);

  useEffect(() => registerReloadGuard(() => {
    if (!draftReady || storageBlocked.current) return false;
    try {
      const stored = loadInspectionState();
      if (JSON.stringify(getStoredInspectionDraft(stored)) !== JSON.stringify(draftSnapshot.current)) return false;
      return true;
    } catch (error) { reportStorageError(error); return false; }
  }), [draftReady, reportStorageError]);

  useEffect(() => {
    if (!unsavedDraft) return;
    const protectInput = (event: BeforeUnloadEvent) => { if (!storageBlocked.current) return; event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protectInput);
    return () => window.removeEventListener("beforeunload", protectInput);
  }, [unsavedDraft]);

  const retryStorage = () => {
    try {
      if (unsavedDraft) saveInspectionDraft(unsavedDraft, userId);
      if (userId) prepareStorageForUser(userId); else loadInspectionState();
      storageBlocked.current = false;
      window.location.reload();
    } catch (error) { reportStorageError(error); }
  };

  const persistRecords = useCallback(
    (next: InspectionRecord[]) => {
      if (storageBlocked.current) throw new Error("请先恢复本机存储");
      try {
        saveInspectionRecords(next, userId);
        recordsRevision.current += 1;
      } catch (error) { reportStorageError(error); throw error; }
    },
    [reportStorageError, userId],
  );

  const markCloudFailure = useCallback(() => {
    if (userId) {
      setPendingSyncCount(getPendingInspectionSyncCount(userId));
    }
    setSyncStatus(navigator.onLine ? "error" : "offline");
  }, [userId]);

  const runCloudChange = useCallback(
    async (operation: Promise<void>) => {
      setSyncStatus("syncing");
      if (userId) {
        setPendingSyncCount(getPendingInspectionSyncCount(userId));
      }
      try {
        await operation;
        const pending = userId ? getPendingInspectionSyncCount(userId) : 0;
        setPendingSyncCount(pending);
        if (
          pending === 0 &&
          !syncInFlight.current &&
          confirmedDraftRevision.current === draftRevision.current
        ) {
          retryAttempt.current = 0;
          setLastSyncedAt(new Date().toISOString());
          setSyncStatus("synced");
        }
      } catch {
        markCloudFailure();
      }
    },
    [markCloudFailure, userId],
  );

  const showHistory = useCallback(() => setTab("history"), []);
  const history = useInspectionHistory({
    userId,
    records,
    values,
    setRecords,
    persistRecords,
    runCloudChange,
    showHistory,
  });
  const backup = useInspectionBackup({
    userId,
    records,
    setRecords,
    persistRecords,
    runCloudChange,
    onRecordsChanged: history.actions.resetHistoryList,
    onStorageError: reportStorageError,
  });
  const initializeBackupFromStorage = backup.actions.initializeFromStorage;

  const syncNow = useCallback(async (background = false) => {
    if (!userId || storageBlocked.current) return;
    // Realtime echoes still reconcile data, but must not restart the spinner.
    // Explicit requests can promote an already-running background check.
    if (!background) setSyncStatus("syncing");
    if (syncInFlight.current) {
      syncRerunRequested.current = true;
      return;
    }
    syncInFlight.current = true;
    syncRerunRequested.current = false;
    const startingDraftRevision = draftRevision.current;
    const startingRecordsRevision = recordsRevision.current;
    setPendingSyncCount(getPendingInspectionSyncCount(userId));
    try {
      const localState = loadInspectionState();
      const result = await syncInspectionAccount(userId, localState);
      if (storageBlocked.current) return;
      if (recordsRevision.current === startingRecordsRevision) {
        saveInspectionRecords(result.records, userId);
        setRecords(result.records);
      } else {
        // A save, delete or import happened after this request started. Its
        // local snapshot must win until a fresh synchronization completes.
        syncRerunRequested.current = true;
      }
      if (draftRevision.current === startingDraftRevision) {
        if (result.draft) {
          saveInspectionDraft(result.draft, userId);
          draftSnapshot.current = result.draft;
          setValues(result.draft.values);
          setBeltTab(result.draft.beltTab);
        } else {
          clearInspectionDraft(userId);
          draftSnapshot.current = null;
        }
        confirmedDraftRevision.current = startingDraftRevision;
        setPendingDraftUpload(null);
      }
      const pending = getPendingInspectionSyncCount(userId);
      setPendingSyncCount(pending);
      if (
        pending === 0 &&
        recordsRevision.current === startingRecordsRevision &&
        draftRevision.current === startingDraftRevision
      ) {
        retryAttempt.current = 0;
        setLastSyncedAt(new Date().toISOString());
        setSyncStatus("synced");
      }
    } catch (error) {
      if (error instanceof InspectionStorageError) reportStorageError(error);
      else markCloudFailure();
    } finally {
      syncInFlight.current = false;
      if (syncRerunRequested.current) {
        syncRerunRequested.current = false;
        window.setTimeout(() => void syncNowRef.current(true), 0);
      }
    }
  }, [markCloudFailure, reportStorageError, userId]);

  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  useEffect(() => {
    let active = true;
    const loadStorage = window.setTimeout(async () => {
      let stored;
      try {
        stored = userId ? prepareStorageForUser(userId) : loadInspectionState();
      } catch (error) { if (active) reportStorageError(error); return; }
      if (!active) return;
      setRecords(stored.records);
      setValues(stored.values);
      setBeltTab(stored.beltTab);
      draftSnapshot.current = getStoredInspectionDraft(stored);
      confirmedDraftRevision.current = userId ? -1 : draftRevision.current;
      recordsRevision.current = 0;
      setPendingSyncCount(
        userId ? getPendingInspectionSyncCount(userId) : 0,
      );
      setPendingDraftUpload(null);
      try { initializeBackupFromStorage(); }
      catch (error) { reportStorageError(error); return; }
      setDraftReady(true);
      if (userId) {
        await syncNow();
        if (!active) return;
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(loadStorage);
    };
  }, [initializeBackupFromStorage, reportStorageError, syncNow, userId]);

  useEffect(() => {
    if (!draftReady || !userId || !pendingDraftUpload) return;
    let uploadDraft = 0;
    const upload = async () => {
      if (syncInFlight.current) {
        uploadDraft = window.setTimeout(upload, 100);
        return;
      }
      if (storageBlocked.current) return;
      setSyncStatus("syncing");
      try {
        const result = await pushInspectionDraft(
          userId,
          pendingDraftUpload.draft,
        );
        if (storageBlocked.current) return;
        if (result === "stale") {
          await syncNow();
          return;
        }
        if (draftRevision.current === pendingDraftUpload.revision) {
          confirmedDraftRevision.current = pendingDraftUpload.revision;
          setPendingDraftUpload(null);
          const pending = getPendingInspectionSyncCount(userId);
          setPendingSyncCount(pending);
          if (pending === 0) {
            retryAttempt.current = 0;
            setLastSyncedAt(new Date().toISOString());
            setSyncStatus("synced");
          }
        }
      } catch {
        markCloudFailure();
      }
    };
    uploadDraft = window.setTimeout(upload, 800);
    return () => window.clearTimeout(uploadDraft);
  }, [draftReady, markCloudFailure, pendingDraftUpload, syncNow, userId]);

  useEffect(() => {
    if (!userId || syncStatus !== "error" || !navigator.onLine) return;
    const delays = [1_000, 3_000, 10_000, 30_000];
    const delay = delays[Math.min(retryAttempt.current, delays.length - 1)];
    retryAttempt.current += 1;
    const timer = window.setTimeout(() => void syncNow(), delay);
    return () => window.clearTimeout(timer);
  }, [syncNow, syncStatus, userId]);

  useInspectionSyncEvents({ userId, draftReady, syncNow });

  const applyDraftChange = useCallback(
    (
      change: (
        current: InspectionDraft,
      ) => Pick<InspectionDraft, "values" | "beltTab">,
    ) => {
      if (!draftReady || storageBlocked.current) return false;
      const current = draftSnapshot.current ?? {
        values: {},
        beltTab: "SZ101" as const,
      };
      const changed = change(current);
      const draft: VersionedInspectionDraft = {
        ...changed,
        updatedAt: createNextDraftUpdatedAt(current.updatedAt),
      };
      try { saveInspectionDraft(draft, userId); }
      catch (error) {
        setUnsavedDraft(draft);
        reportStorageError(error);
        return false;
      }
      const revision = draftRevision.current + 1;
      draftRevision.current = revision;
      draftSnapshot.current = draft;
      setValues(draft.values);
      setBeltTab(draft.beltTab);
      setPendingDraftUpload({ draft, revision });
      setSyncStatus(
        userId ? (navigator.onLine ? "syncing" : "offline") : "local",
      );
      return true;
    },
    [draftReady, reportStorageError, userId],
  );

  const draftActions = useInspectionDraftActions(applyDraftChange);

  const selectTab = (nextTab: InspectionTab) => {
    setTab(nextTab);
    if (nextTab === "history") {
      history.actions.resetHistoryList();
    }
  };

  return {
    state: {
      tab,
      draftReady,
      storageError,
      unsavedDraft,
      beltTab,
      values,
      records,
      ...history.state,
      ...backup.state,
      syncStatus,
      pendingSyncCount,
      lastSyncedAt,
    },
    actions: {
      ...draftActions,
      retryStorage,
      selectTab,
      selectRecord: history.actions.selectRecord,
      setHistoryDirection: history.actions.setHistoryDirection,
      returnToHistoryList: history.actions.returnToHistoryList,
      toggleHistoryManagement: history.actions.toggleHistoryManagement,
      toggleRecord: history.actions.toggleRecord,
      deleteRecords: history.actions.deleteRecords,
      commitSave: history.actions.commitSave,
      save: history.actions.save,
      cancelSaveValidation: history.actions.cancelSaveValidation,
      openBackup: () => {
        history.actions.setHistoryDirection(1);
        backup.actions.openBackup();
      },
      closeBackup: () => {
        history.actions.setHistoryDirection(-1);
        backup.actions.closeBackup();
      },
      exportBackup: backup.actions.exportBackup,
      previewImportFile: backup.actions.previewImportFile,
      cancelImportPreview: backup.actions.cancelImportPreview,
      mergeImport: backup.actions.mergeImport,
      replaceImport: backup.actions.replaceImport,
      undoImport: backup.actions.undoImport,
      syncNow,
    },
  };
}
