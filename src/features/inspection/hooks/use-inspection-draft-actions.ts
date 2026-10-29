import { useMemo } from "react";
import { toast } from "sonner";
import {
  getBeltItemKeys,
  getBeltItemTitle,
  getPumpCardKeys,
  selectPump,
} from "../model/field-rules";
import type { BeltId, InspectionDraft, PumpAreaId } from "../model/types";

type ApplyDraftChange = (
  change: (current: InspectionDraft) => Pick<InspectionDraft, "values" | "beltTab">,
) => void;

/** Stable event handlers; constructing them never reads or writes the draft. */
export function useInspectionDraftActions(applyDraftChange: ApplyDraftChange) {
  return useMemo(() => createInspectionDraftActions(applyDraftChange), [applyDraftChange]);
}

/** Field actions pass through the controller's single versioned persistence entry. */
export function createInspectionDraftActions(applyDraftChange: ApplyDraftChange) {
  const updateValue = (fieldKey: string, value: string) => {
    applyDraftChange((current) => ({
      values: { ...current.values, [fieldKey]: value },
      beltTab: current.beltTab,
    }));
  };

  const clearKeys = (keys: string[]) => {
    const previousValues: Array<{
      key: string;
      existed: boolean;
      value: string;
    }> = [];

    applyDraftChange((current) => ({
      values: Object.fromEntries(
        Object.entries(current.values).concat(
          keys.map((key) => {
            previousValues.push({
              key,
              existed: Object.hasOwn(current.values, key),
              value: current.values[key] ?? "",
            });
            return [key, ""];
          }),
        ),
      ),
      beltTab: current.beltTab,
    }));

    return () => {
      applyDraftChange((current) => {
        const restoredValues = { ...current.values };
        previousValues.forEach(({ key, existed, value }) => {
          if (existed) restoredValues[key] = value;
          else delete restoredValues[key];
        });
        return { values: restoredValues, beltTab: current.beltTab };
      });
    };
  };

  const clearPump = (area: PumpAreaId, group: string, index: number) => {
    const undoClear = clearKeys(getPumpCardKeys(area, group, index));
    toast.success(`已清空${area === "slag8" ? "8#" : "9#"}${group}`, {
      action: {
        label: "撤销",
        onClick: undoClear,
      },
    });
  };

  const choosePump = (
    area: PumpAreaId,
    group: string,
    index: number,
    pumpNo: string,
  ) => {
    applyDraftChange((current) => ({
      values: selectPump(current.values, area, group, index, pumpNo),
      beltTab: current.beltTab,
    }));
  };

  const selectBeltTab = (nextBeltTab: BeltId) => {
    applyDraftChange((current) => ({
      values: current.values,
      beltTab: nextBeltTab,
    }));
  };

  const clearBeltItem = (
    id: BeltId,
    ends: readonly string[],
    item: string,
  ) => {
    const undoClear = clearKeys(getBeltItemKeys(id, ends, item));
    const itemTitle = getBeltItemTitle(id, item);
    toast.success(`已清空${id} ${itemTitle}`, {
      action: {
        label: "撤销",
        onClick: undoClear,
      },
    });
  };

  const createNewInspection = () => {
    applyDraftChange(() => ({ values: {}, beltTab: "SZ101" }));
    toast("已新建空白记录");
  };

  return {
    updateValue,
    clearPump,
    choosePump,
    clearBeltItem,
    setBeltTab: selectBeltTab,
    createNewInspection,
  };
}
