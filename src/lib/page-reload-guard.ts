type ReloadGuard = () => boolean;
const guards = new Set<ReloadGuard>();

export function registerReloadGuard(guard: ReloadGuard) {
  guards.add(guard);
  return () => { guards.delete(guard); };
}

/** Every mounted data owner must confirm that reloading can preserve its state. */
export function canReloadPage() {
  try { return [...guards].every(guard => guard()); }
  catch { return false; }
}
