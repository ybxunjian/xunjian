export type StorageFailureKind = "corrupt" | "quota" | "unavailable";

export class InspectionStorageError extends Error {
  constructor(
    public readonly kind: StorageFailureKind,
    public readonly keys: string[],
    public readonly originals: Record<string, string | null> = {},
  ) {
    super(kind === "corrupt" ? "本地数据无法读取，原始内容已保留" : kind === "quota"
      ? "本机存储空间不足，保存未完成" : "本机存储暂不可用，请稍后重试");
    this.name = "InspectionStorageError";
  }
}

export function storageFailure(error: unknown, keys: string[] = []) {
  return error instanceof InspectionStorageError ? error : new InspectionStorageError(
    error instanceof Error && ["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(error.name)
      ? "quota" : "unavailable", keys,
  );
}

export function readStoredValue(key: string) {
  try { return localStorage.getItem(key); }
  catch (error) { throw storageFailure(error, [key]); }
}

export function readStoredJson(key: string): unknown {
  const raw = readStoredValue(key);
  if (raw === null) return null;
  try { const value: unknown = JSON.parse(raw); if (value === null) throw new Error("invalid null"); return value; }
  catch { throw new InspectionStorageError("corrupt", [key], { [key]: raw }); }
}

export function corruptStorage(key: string): never {
  throw new InspectionStorageError("corrupt", [key], { [key]: readStoredValue(key) });
}

/** Restore the exact old strings if any part of a workspace/cache update fails. */
export function writeStoredValues(changes: Record<string, string | null>) {
  const originals = Object.fromEntries(Object.keys(changes).map(key => [key, readStoredValue(key)]));
  const written: string[] = [];
  try {
    for (const [key, value] of Object.entries(changes)) {
      if (value === originals[key]) continue;
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      written.push(key);
    }
  } catch (error) {
    for (const key of written.reverse()) {
      try {
        const value = originals[key];
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch { /* The pre-write strings remain available in the recovery export. */ }
    }
    const failure = storageFailure(error, Object.keys(changes));
    throw new InspectionStorageError(failure.kind, failure.keys, originals);
  }
}
