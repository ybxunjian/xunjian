import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { setHistoryMenuMotionCheck } from "../model/history-menu-motion-check";

type Mode = "normal" | "fixed";
type Sample = {
  ms: number;
  scrollY: number;
  scrollX: number;
  viewportTop: number | null;
  viewportHeight: number | null;
  documentHeight: number;
  navigationTop: number | null;
  headingTop: number | null;
  menuTop: number | null;
  lineY: number | null;
};
type Run = { mode: Mode; action: "enter" | "back"; samples: Sample[] };

function MenuMotionCheck({ initialMode, onClose }: { initialMode: Mode; onClose: () => void }) {
  const [mode, setMode] = useState(initialMode);
  const [summary, setSummary] = useState("将标题滚到导航附近，再进入、返回详情。");
  const [report, setReport] = useState("");
  const runs = useRef<Run[]>([]);
  const sampling = useRef(false);

  useEffect(() => {
    setHistoryMenuMotionCheck(mode);
    let frame = 0;
    let disposed = false;

    const start = (event: Event) => {
      if (sampling.current || !(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (!button || button.closest("[data-menu-check-panel]")) return;
      const label = button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "";
      const action = label.startsWith("查看 ") && label.endsWith("的巡检详情")
        ? "enter"
        : /^返回(历史记录|巡检日历)$/.test(label) ? "back" : null;
      if (!action) return;
      sampling.current = true;
      const run: Run = { mode, action, samples: [] };
      const started = performance.now();
      const sample = () => {
        if (disposed) return;
        const menu = document.querySelector<HTMLElement>('button[aria-label="展开管理菜单"]');
        const heading = [...document.querySelectorAll("h2")].find((element) => /^(历史记录|巡检汇总)$/.test(element.textContent ?? ""));
        run.samples.push({
          ms: Math.round(performance.now() - started),
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          viewportTop: window.visualViewport?.offsetTop ?? null,
          viewportHeight: window.visualViewport?.height ?? null,
          documentHeight: document.documentElement.scrollHeight,
          navigationTop: document.querySelector('nav[aria-label="巡检页面"]')?.getBoundingClientRect().top ?? null,
          headingTop: heading?.getBoundingClientRect().top ?? null,
          menuTop: menu?.getBoundingClientRect().top ?? null,
          lineY: menu?.querySelector<SVGPathElement>("path")?.getBBox().y ?? null,
        });
        if (performance.now() - started < 1000) {
          frame = requestAnimationFrame(sample);
        } else {
          runs.current = [...runs.current.slice(-11), run];
          sampling.current = false;
          const ys = run.samples.map((point) => point.scrollY);
          const change = Math.max(...ys) - Math.min(...ys);
          setSummary(`${mode === "normal" ? "原动画" : "固定线条"} · ${action === "enter" ? "进入" : "返回"}：滚动变化 ${change.toFixed(2)}px（已记录 ${runs.current.length} 次）`);
        }
      };
      sample();
    };
    document.addEventListener("pointerdown", start, true);
    document.addEventListener("click", start, true);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      sampling.current = false;
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("click", start, true);
      setHistoryMenuMotionCheck("normal");
    };
  }, [mode]);

  const copyReport = async () => {
    const value = JSON.stringify({
      userAgent: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
      supportsScrollAnchor: CSS.supports("overflow-anchor", "none"),
      runs: runs.current.map((run) => {
        const linePositions = run.samples.flatMap((sample) => sample.lineY === null ? [] : [sample.lineY]);
        return {
          mode: run.mode,
          action: run.action,
          lineRange: linePositions.length ? [Math.min(...linePositions), Math.max(...linePositions)] : null,
          samples: run.samples.filter((sample, index, all) => {
            if (index === 0 || index === all.length - 1) return true;
            const previous = all[index - 1];
            return sample.scrollY !== previous.scrollY || sample.scrollX !== previous.scrollX
              || sample.viewportTop !== previous.viewportTop || sample.viewportHeight !== previous.viewportHeight
              || sample.documentHeight !== previous.documentHeight || sample.navigationTop !== previous.navigationTop
              || sample.headingTop !== previous.headingTop || sample.menuTop !== previous.menuTop;
          }),
        };
      }),
    });
    try {
      await navigator.clipboard.writeText(value);
      setSummary("结果已复制，可以粘贴发给我。");
    } catch {
      setReport(value);
      setSummary("请长按下方结果，全选复制。");
    }
  };

  return (
    <aside
      data-menu-check-panel
      aria-label="汉堡动画对照测试"
      className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-card border border-border bg-card p-3 text-foreground shadow-floating"
      style={{ overflowAnchor: "none" }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <b className="text-body">汉堡动画对照</b>
        <Button variant="ghost" onClick={onClose}>关闭测试</Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={mode === "normal" ? "default" : "outline"} aria-pressed={mode === "normal"} onClick={() => setMode("normal")}>原动画</Button>
        <Button variant={mode === "fixed" ? "default" : "outline"} aria-pressed={mode === "fixed"} onClick={() => setMode("fixed")}>固定线条</Button>
      </div>
      <p className="my-2 text-caption text-muted-foreground" aria-live="polite">{summary}</p>
      <Button variant="secondary" className="w-full" onClick={copyReport}>复制检测结果</Button>
      {report && <textarea aria-label="检测结果" readOnly value={report} className="mt-2 h-20 w-full rounded-control border border-border p-2 text-caption" />}
    </aside>
  );
}

/** Opt-in, in-memory diagnostics. No record data or network logging. */
export function mountHistoryMenuCheck(initialMode: Mode) {
  const host = document.createElement("div");
  host.dataset.historyMenuCheckHost = "";
  document.body.append(host);
  const root = createRoot(host);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    root.unmount();
    host.remove();
  };
  root.render(<MenuMotionCheck initialMode={initialMode} onClose={close} />);
  return close;
}
