import { ClearButton } from "@/components/ui/clear-button";
import { Card, CardContent } from "@/components/ui/card";
import { BELTS } from "../../model/config";
import {
  getBeltItemTitle,
  getBeltPoints,
  getVisibleBeltItems,
} from "../../model/field-rules";
import type { BeltId, InspectionValues } from "../../model/types";
import { InspectionField } from "../inspection-field";
import { SectionHeading } from "../section-heading";
import { BeltTabs } from "./belt-tabs";

type BeltAreaProps = {
  beltTab: BeltId;
  values: InspectionValues;
  onSelectBelt: (belt: BeltId) => void;
  onValueChange: (fieldKey: string, value: string) => void;
  onClearItem: (
    belt: BeltId,
    ends: readonly string[],
    item: string,
  ) => void;
};

export function BeltArea({
  beltTab,
  values,
  onSelectBelt,
  onValueChange,
  onClearItem,
}: BeltAreaProps) {
  const belt = BELTS.find(({ id }) => id === beltTab) ?? BELTS[0];

  return (
    <>
      <SectionHeading title="皮带区域" />
      <BeltTabs value={beltTab} onChange={onSelectBelt} />
      <div className="space-y-2.5">
        {getVisibleBeltItems(belt.id).map((item) => {
          const points = getBeltPoints(belt.id, belt.ends, item);
          return (
            <Card key={item}>
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <b className="text-card-title text-foreground">
                    {item !== "配重" && item.startsWith("配重") && (
                      <span
                        className="mr-1.5 inline-block size-1.5 rounded-full bg-primary/70 align-middle"
                        aria-hidden="true"
                      />
                    )}
                    {getBeltItemTitle(belt.id, item)}
                  </b>
                  <ClearButton onClick={() => onClearItem(belt.id, belt.ends, item)} />
                </div>
                <div
                  className={`mt-2.5 grid gap-2 ${points.length === 1 ? "grid-cols-1" : "grid-cols-[repeat(2,minmax(0,1fr))]"}`}
                >
                  {points.map((point) => (
                    <InspectionField
                      key={point.key}
                      label={point.label}
                      fieldKey={point.key}
                      value={values[point.key] || ""}
                      onChange={onValueChange}
                      align="center"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
