import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

interface VariantOption {
  id: string;
  name: string;
  values: Array<{ id: string; value: string }>;
}

interface VariantSku {
  id: string;
  stock: number;
  optionValues: Array<{ id: string; optionId: string }>;
}

interface VariantChipsProps {
  options: VariantOption[];
  skus: VariantSku[];
  selectedValues: Record<string, string>;
  onSelect: (optionId: string, valueId: string) => void;
}

export function VariantChips({
  options,
  skus,
  selectedValues,
  onSelect,
}: VariantChipsProps) {
  return (
    <div className="space-y-4">
      {options.map((option) => {
        const selectedValue = selectedValues[option.id];
        const selectedLabel = option.values.find(
          (value) => value.id === selectedValue
        )?.value;

        return (
          <div key={option.id} className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                {option.name}
              </p>

              {!!selectedLabel && (
                <span className="truncate font-medium text-xs">
                  {selectedLabel}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selectedValue === value.id;

                const isAvailable = skus.some((sku) => {
                  if (sku.stock <= 0) {
                    return false;
                  }

                  const containsValue = sku.optionValues.some(
                    (optionValue) =>
                      optionValue.optionId === option.id &&
                      optionValue.id === value.id
                  );

                  if (!containsValue) {
                    return false;
                  }

                  return Object.entries(selectedValues).every(
                    ([selectedOptionId, selectedValueId]) =>
                      selectedOptionId === option.id ||
                      sku.optionValues.some(
                        (optionValue) =>
                          optionValue.optionId === selectedOptionId &&
                          optionValue.id === selectedValueId
                      )
                  );
                });

                return (
                  <button
                    key={value.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => onSelect(option.id, value.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 font-medium text-sm transition-all",
                      "hover:border-foreground/40 hover:bg-accent",
                      "disabled:pointer-events-none disabled:line-through disabled:opacity-40",
                      isSelected &&
                        "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    {value.value}

                    {isSelected && <CheckIcon className="size-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
