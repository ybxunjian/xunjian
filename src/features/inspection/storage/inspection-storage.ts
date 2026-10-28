import { isInspectionValues } from "../model/validation";
import { corruptStorage, readStoredJson, readStoredValue, writeStoredValues } from "./inspection-storage-safety";
import { isBeltId } from "../model/field-rules";
import type {
  BeltId,
  InspectionDraft,
  InspectionRecord,
  InspectionValues,
} from "../model/types";
import { normalizeInspectionRecord } from "./inspection-backup";

export const RECORDS_STORAGE_KEY = "night-inspection";
export const DRAFT_STORAGE_KEY = "night-inspection-draft";
const LAST_BACKUP_STORAGE_KEY = "night-inspection-last-backup";
const IMPORT_UNDO_STORAGE_KEY = "night-inspection-import-undo";
const STORAGE_OWNER_KEY = "night-inspection-owner";

const ACCOUNT_CACHE_PREFIX = "night-inspection-account:";
const IMPORT_UNDO_TTL_MS = 5 * 60 * 1000;

type ImportUndoSnapshot = {
  records: InspectionRecord[];
  expiresAt: number;
};

export type StoredInspectionState = {
  records: InspectionRecord[];
  values: InspectionValues;
  beltTab: BeltId;
  draftUpdatedAt: string | null;
  hasDraft: boolean;
};

/** Preserve the distinction between a missing draft and a saved empty draft. */
export function getStoredInspectionDraft(
  state: StoredInspectionState,
): InspectionDraft | null {
  if (!state.hasDraft) return null;
  return {
    values: state.values,
    beltTab: state.beltTab,
    ...(state.draftUpdatedAt ? { updatedAt: state.draftUpdatedAt } : {}),
  };
}

export function loadInspectionState(): StoredInspectionState {
  let records: InspectionRecord[] = [];
  let values: InspectionValues = {};
  let beltTab: BeltId = "SZ101";
  let draftUpdatedAt: string | null = null;
  let hasDraft = false;

  const storedRecords = readStoredJson(RECORDS_STORAGE_KEY);
  if (storedRecords !== null) {
    records = readRecords(storedRecords, RECORDS_STORAGE_KEY);
  }
  const draft = readStoredJson(DRAFT_STORAGE_KEY);
  if (draft !== null) {
    hasDraft = true;
    if (typeof draft === "object" && !Array.isArray(draft) && "values" in draft) {
      const saved = draft as Partial<InspectionDraft>;
      if (!isInspectionValues(saved.values)) corruptStorage(DRAFT_STORAGE_KEY);
      values = saved.values;
      if (isBeltId(saved.beltTab)) beltTab = saved.beltTab;
      if (typeof saved.updatedAt === "string" && !Number.isNaN(Date.parse(saved.updatedAt))) {
        draftUpdatedAt = saved.updatedAt;
      }
    } else if (isInspectionValues(draft)) {
      values = draft;
    } else corruptStorage(DRAFT_STORAGE_KEY);
  }

  return { records, values, beltTab, draftUpdatedAt, hasDraft };
}

function readRecords(value: unknown, key: string): InspectionRecord[] {
  if (!Array.isArray(value)) corruptStorage(key);
  return value.map(item => normalizeInspectionRecord(item) ?? corruptStorage(key));
}

function persistWorkspace(state: StoredInspectionState, userId?: string) {
  const draft = getStoredInspectionDraft(state);
  const changes: Record<string, string | null> = {
    [RECORDS_STORAGE_KEY]: JSON.stringify(state.records),
    [DRAFT_STORAGE_KEY]: draft ? JSON.stringify(draft) : null,
  };
  if (userId) {
    if (readStoredValue(STORAGE_OWNER_KEY) !== userId) throw new Error("本机数据归属已变化，请重新加载");
    loadAccountCache(userId); // A corrupt account cache must not be silently overwritten.
    changes[`${ACCOUNT_CACHE_PREFIX}${userId}`] = JSON.stringify(state);
  }
  writeStoredValues(changes);
}

export function saveInspectionRecords(records: InspectionRecord[], userId?: string) {
  persistWorkspace({ ...loadInspectionState(), records }, userId);
}

export function saveInspectionDraft(draft: InspectionDraft, userId?: string) {
  persistWorkspace({ ...loadInspectionState(), values: draft.values, beltTab: draft.beltTab,
    hasDraft: true, draftUpdatedAt: draft.updatedAt ?? null }, userId);
}

export function clearInspectionDraft(userId?: string) {
  persistWorkspace({ ...loadInspectionState(), values: {}, beltTab: "SZ101",
    hasDraft: false, draftUpdatedAt: null }, userId);
}

export function loadLastBackupAt() {
  return readStoredValue(LAST_BACKUP_STORAGE_KEY);
}

export function saveLastBackupAt(value: string) {
  writeStoredValues({ [LAST_BACKUP_STORAGE_KEY]: value });
}

export function saveImportUndo(records: InspectionRecord[]): ImportUndoSnapshot {
  const savedAt = new Date().toISOString();
  const expiresAt = Date.parse(savedAt) + IMPORT_UNDO_TTL_MS;
  writeStoredValues({ [IMPORT_UNDO_STORAGE_KEY]: JSON.stringify({ savedAt, expiresAt: new Date(expiresAt).toISOString(), records }) });
  return { records, expiresAt };
}

export function loadImportUndo(): ImportUndoSnapshot | null {
  const parsed = readStoredJson(IMPORT_UNDO_STORAGE_KEY);
  if (parsed === null) return null;
  if (!parsed || typeof parsed !== "object" || !("savedAt" in parsed) || typeof parsed.savedAt !== "string" ||
    !("records" in parsed) || !Array.isArray(parsed.records)) corruptStorage(IMPORT_UNDO_STORAGE_KEY);
  const savedAt = Date.parse(parsed.savedAt);
  if (Number.isNaN(savedAt)) corruptStorage(IMPORT_UNDO_STORAGE_KEY);
  const explicitExpiry = "expiresAt" in parsed && typeof parsed.expiresAt === "string" ? Date.parse(parsed.expiresAt) : NaN;
  const expiresAt = Number.isNaN(explicitExpiry) ? savedAt + IMPORT_UNDO_TTL_MS : explicitExpiry;
  if (expiresAt <= Date.now()) { clearImportUndo(); return null; }
  return { records: readRecords(parsed.records, IMPORT_UNDO_STORAGE_KEY), expiresAt };
}

export function clearImportUndo() {
  writeStoredValues({ [IMPORT_UNDO_STORAGE_KEY]: null });
}

export function prepareStorageForUser(userId: string): StoredInspectionState {
  const owner = readStoredValue(STORAGE_OWNER_KEY);
  const current = loadInspectionState();
  if (owner === userId) { loadAccountCache(userId); return current; }
  const cached = loadAccountCache(userId);
  const next = owner ? cached ?? emptyInspectionState() : current;
  const draft = getStoredInspectionDraft(next);
  const changes: Record<string, string | null> = {
    [RECORDS_STORAGE_KEY]: JSON.stringify(next.records),
    [DRAFT_STORAGE_KEY]: draft ? JSON.stringify(draft) : null,
    [`${ACCOUNT_CACHE_PREFIX}${userId}`]: JSON.stringify(next),
    [STORAGE_OWNER_KEY]: userId,
  };
  if (owner) {
    loadAccountCache(owner);
    changes[`${ACCOUNT_CACHE_PREFIX}${owner}`] = JSON.stringify(current);
    changes[IMPORT_UNDO_STORAGE_KEY] = null;
    changes[LAST_BACKUP_STORAGE_KEY] = null;
  }
  writeStoredValues(changes);
  return next;
}

function loadAccountCache(userId: string): StoredInspectionState | null {
  const key = `${ACCOUNT_CACHE_PREFIX}${userId}`;
  const parsed = readStoredJson(key);
  if (parsed === null) return null;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !("records" in parsed)) corruptStorage(key);
  const cached = parsed as Partial<StoredInspectionState>;
  const records = readRecords(cached.records, key);
  const values = cached.values ?? {};
  if (!isInspectionValues(values)) corruptStorage(key);
  const draftUpdatedAt = typeof cached.draftUpdatedAt === "string" ? cached.draftUpdatedAt : null;
  return { records, values, beltTab: isBeltId(cached.beltTab) ? cached.beltTab : "SZ101", draftUpdatedAt,
    hasDraft: typeof cached.hasDraft === "boolean" ? cached.hasDraft : draftUpdatedAt !== null || Object.keys(values).length > 0 };
}

/** Only export inspection data belonging to the currently displayed account. */
export function readInspectionRecoveryData(userId?: string, originals: Record<string, string | null> = {}) {
  // A failed account switch may also fail to roll back the owner marker.
  // Scope recovery by the pre-write owner, not a partially changed marker.
  const owner = originals[STORAGE_OWNER_KEY] ?? readStoredValue(STORAGE_OWNER_KEY);
  const keys = userId && owner && owner !== userId
    ? [`${ACCOUNT_CACHE_PREFIX}${userId}`]
    : [RECORDS_STORAGE_KEY, DRAFT_STORAGE_KEY, ...(userId ? [`${ACCOUNT_CACHE_PREFIX}${userId}`] : [])];
  return Object.fromEntries(keys.map(key => [key, readStoredValue(key)]));
}

function emptyInspectionState(): StoredInspectionState {
  return {
    records: [],
    values: {},
    beltTab: "SZ101",
    draftUpdatedAt: null,
    hasDraft: false,
  };
}
