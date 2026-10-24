import { ClearButton } from "@/components/ui/clear-button";
import { Card, CardContent } from "@/components/ui/card";
import { PUMP_AREAS, PUMP_READING_FIELDS } from "../../model/config";
import { fieldKey } from "../../model/field-rules";
import type { InspectionValues, PumpAreaId } from "../../model/types";
import { InspectionField } from "../inspection-field";
import { SectionHeading } from "../section-heading";
import { ChevronDown } from "lucide-react";

type PumpAreaProps = {
  area: PumpAreaId;
  values: InspectionValues;
  onValueChange: (fieldKey: string, value: string) => void;
  onSelectPump: (
    area: PumpAreaId,
    group: string,
    index: number,
    pumpNo: string,
  ) => void;
  onClearPump: (area: PumpAreaId, group: string, index: number) => void;
};

export function PumpArea({
  area,
  values,
  onValueChange,
  onSelectPump,
  onClearPump,
}: PumpAreaProps) {
  const config = PUMP_AREAS[area];

  return (
    <>
      <SectionHeading title={config.title} />
      {config.groups.map(([group, pumpNumbers]) => (
        <section key={group}>
          {[0, 1].map((index) => (
            <Card className="mb-3" key={index}>
              <CardContent>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <b className="font-section shrink-0 text-body text-foreground">{group}</b>
                    <div className="relative">
                      <select
                        value={
                          values[fieldKey(area, group, String(index), "no")] || ""
                        }
                        onChange={(event) =>
                          onSelectPump(
                            area,
                            group,
                            index,
                            event.target.value,
                          )
                        }
                        className="w-[108px] rounded-control bg-muted p-3 font-data-secondary leading-[18px] text-primary outline-none"
                      >
                        <option value="">选择</option>
                        {pumpNumbers.map((pumpNumber) => (
                          <option key={pumpNumber}>{pumpNumber}</option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden="true" strokeWidth={2.5}
                        className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-primary" />
                    </div>
                  </div>
                  <ClearButton onClick={() => onClearPump(area, group, index)} />
                </div>
                <div className="pump-readings mt-2 grid grid-cols-4 gap-compact">
                  {PUMP_READING_FIELDS.map(([label, field]) => {
                    const key = fieldKey(area, group, String(index), field);
                    return (
                      <InspectionField
                        key={field}
                        label={label}
                        fieldKey={key}
                        value={values[key] || ""}
                        onChange={onValueChange}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </>
  );
}
