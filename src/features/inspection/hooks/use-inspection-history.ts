import { startTransition, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type {
  DeleteRequest,
  InspectionRecord,
  InspectionValues,
  SaveValidation,
} from "../model/types";
import { validateInspection } from "../model/validation";
import {
  deleteCloudInspectionRecords,
  pushInspectionRecord,
  restoreCloudInspectionRecords,
} from "../sync/inspection-cloud-sync";
import { mergeInspectionRecords } from "../storage/inspection-backup";

type UseInspectionHistoryOptions = {
  userId?: string;
  records: InspectionRecord[];
  values: InspectionValues;
  setRecords: Dispatch<SetStateAction<InspectionRecord[]>>;
  persistRecords: (records: InspectionRecord[]) => void;
  runCloudChange: (operation: Promise<void>) => Promise<void>;
  showHistory: () => void;
};

export function useInspectionHistory({
  userId,
  records,
  values,
  setRecords,
  persistRecords,
  runCloudChange,
  showHistory,
}: UseInspectionHistoryOptions) {
  const recordsRef = useRef(records);
  const activeRef = useRef(true);
  const deleteToastIds = useRef(new Set<string | number>());
  useLayoutEffect(() => { recordsRef.current = records; }, [records]);
  useEffect(() => {
    activeRef.current = true;
    const ids = deleteToastIds.current;
    return () => {
      activeRef.current = false;
      ids.forEach((id) => toast.dismiss(id));
      ids.clear();
    };
  }, []);

  const commitRecords = (next: InspectionRecord[]) => {
    persistRecords(next);
    recordsRef.current = next;
    setRecords(next);
  };
  const [selectedRecord, setSelectedRecord] =
    useState<InspectionRecord | null>(null);
  const [historyDirection, setHistoryDirection] = useState<1 | -1>(1);
  const [manageHistory, setManageHistory] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [saveValidation, setSaveValidation] =
    useState<SaveValidation | null>(null);

  const resetHistoryList = () => {
    setHistoryDirection(-1);
    setSelectedRecord(null);
    setManageHistory(false);
    setSelectedRecordIds([]);
  };

  const resetAfterRecordsChanged = () => {
    setHistoryDirection(-1);
    setSelectedRecord(null);
    setManageHistory(false);
    setSelectedRecordIds([]);
  };

  const selectRecord = (record: InspectionRecord) => {
    startTransition(() => {
      setHistoryDirection(1);
      setSelectedRecord(record);
    });
  };

  const returnToHistoryList = () => {
    startTransition(() => {
      setHistoryDirection(-1);
      setSelectedRecord(null);
    });
  };

  const toggleHistoryManagement = () => {
    setManageHistory((current) => !current);
    setSelectedRecordIds([]);
  };

  const toggleRecord = (id: string) => {
    setSelectedRecordIds((current) =>
      current.includes(id)
        ? current.filter((recordId) => recordId !== id)
        : [...current, id],
    );
  };

  const confirmDeleteRecords = () => {
    if (!deleteRequest) return;
    const deleting = new Set(deleteRequest.ids);
    const deletedRecords = recordsRef.current.filter((record) => deleting.has(record.id));
    const next = recordsRef.current.filter((record) => !deleting.has(record.id));
    commitRecords(next);
    if (selectedRecord && deleting.has(selectedRecord.id)) {
      setHistoryDirection(-1);
      setSelectedRecord(null);
    }
    setSelectedRecordIds([]);
    setManageHistory(false);
    setDeleteRequest(null);
    if (userId) {
      void runCloudChange(
        deleteCloudInspectionRecords(userId, deleteRequest.ids),
      );
    }
    let restored = false;
    const toastId = toast.success(
      deleteRequest.ids.length > 1
        ? `已删除 ${deleteRequest.ids.length} 条记录`
        : "已删除历史记录",
      {
        action: {
          label: "撤销",
          onClick: () => {
            if (restored || !activeRef.current) return;
            try {
              commitRecords(mergeInspectionRecords(recordsRef.current, deletedRecords));
              restored = true;
              deleteToastIds.current.delete(toastId);
              if (userId) {
                void runCloudChange(restoreCloudInspectionRecords(userId, deletedRecords));
              }
              toast.success("已撤销删除");
            } catch {
              toast.error("撤销失败，请稍后重试");
            }
          },
        },
        onDismiss: () => deleteToastIds.current.delete(toastId),
        onAutoClose: () => deleteToastIds.current.delete(toastId),
      },
    );
    deleteToastIds.current.add(toastId);
  };

  const commitSave = () => {
    const now = new Date();
    const record: InspectionRecord = {
      id: crypto.randomUUID(),
      date: now.toLocaleDateString("zh-CN"),
      time: now.toLocaleString("zh-CN"),
      createdAt: now.toISOString(),
      values,
    };
    const next = [record, ...recordsRef.current];
    commitRecords(next);
    resetAfterRecordsChanged();
    setSaveValidation(null);
    showHistory();
    if (userId) {
      void runCloudChange(pushInspectionRecord(userId, record));
    }
    toast.success("本次巡检已保存");
  };

  const save = () => {
    const missing = validateInspection(values);
    if (missing.unselectedPumps.length || missing.emptyInputs.length) {
      setSaveValidation(missing);
      return;
    }
    commitSave();
  };

  return {
    state: {
      selectedRecord,
      historyDirection,
      manageHistory,
      selectedRecordIds,
      deleteRequest,
      saveValidation,
    },
    actions: {
      setHistoryDirection,
      resetHistoryList,
      resetAfterRecordsChanged,
      selectRecord,
      returnToHistoryList,
      toggleHistoryManagement,
      toggleRecord,
      setDeleteRequest,
      confirmDeleteRecords,
      commitSave,
      save,
      cancelSaveValidation: () => setSaveValidation(null),
      cancelDeleteRequest: () => setDeleteRequest(null),
    },
  };
}
