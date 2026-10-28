import { canReloadPage } from "./page-reload-guard";

type UpdateActions = {
  available: (apply: () => void) => void;
  blocked: () => void;
  failed: () => void;
  reload: () => void;
};

/** Installing a first offline shell never prompts or reloads the page. */
export function watchServiceWorkerUpdates(
  registration: ServiceWorkerRegistration,
  container: ServiceWorkerContainer,
  actions: UpdateActions,
) {
  let requested = false;
  let disposed = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const tracked = new Set<ServiceWorker>();
  const fail = () => { requested = false; actions.failed(); };
  const apply = () => {
    if (disposed || requested) return;
    if (!canReloadPage()) { actions.blocked(); return; }
    const worker = registration.waiting;
    if (!worker) { fail(); return; }
    requested = true;
    timeout = setTimeout(fail, 15_000);
    try { worker.postMessage({ type: "ACTIVATE_UPDATE" }); }
    catch { clearTimeout(timeout); fail(); }
  };
  const inspect = () => {
    if (!disposed && registration.waiting && container.controller) actions.available(apply);
  };
  const changed = () => {
    inspect();
  };
  const track = () => {
    const worker = registration.installing;
    if (worker && !tracked.has(worker)) {
      tracked.add(worker);
      worker.addEventListener("statechange", changed);
    }
    inspect();
  };
  const controllerChanged = () => {
    if (!requested || disposed) return;
    clearTimeout(timeout);
    requested = false;
    // Editing or a storage failure may have happened during activation.
    if (!canReloadPage()) { actions.blocked(); return; }
    actions.reload();
  };
  registration.addEventListener("updatefound", track);
  container.addEventListener("controllerchange", controllerChanged);
  track();
  return () => {
    disposed = true;
    clearTimeout(timeout);
    registration.removeEventListener("updatefound", track);
    container.removeEventListener("controllerchange", controllerChanged);
    tracked.forEach(worker => worker.removeEventListener("statechange", changed));
  };
}
