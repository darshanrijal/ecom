"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { type RouterOutputs, trpc } from "@/__rpc/client";
import { slugify } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { ProductImageField } from "./product-image-field";

type EditData = NonNullable<RouterOutputs["admin"]["products"]["get"]>;

interface OptionDraft {
  key: string;
  name: string;
  valuesText: string;
}

interface SkuDraft {
  key: string;
  code: string;
  price: string;
  originalPrice: string;
  stock: string;
  imageUrl: string;
  combination: Record<string, string>;
}

interface ProductFormProps {
  product?: EditData | null;
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

const makeOption = (): OptionDraft => ({
  key: crypto.randomUUID(),
  name: "",
  valuesText: "",
});

const makeSku = (): SkuDraft => ({
  key: crypto.randomUUID(),
  code: "",
  price: "",
  originalPrice: "",
  stock: "0",
  imageUrl: "",
  combination: {},
});

const splitValues = (text: string) =>
  text
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const uniqueValues = (list: string[]) =>
  list.filter(
    (value, index) =>
      list.findIndex((other) => other.toLowerCase() === value.toLowerCase()) ===
      index
  );

const comboKey = (combination: Record<string, string>) =>
  Object.entries(combination)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([option, value]) => `${option.toLowerCase()}:${value.toLowerCase()}`)
    .join("|");

function computeCombos(options: OptionDraft[]) {
  const defined = options.filter(
    (option) =>
      option.name.trim() !== "" && splitValues(option.valuesText).length > 0
  );
  if (defined.length === 0) {
    return [];
  }
  const lists = defined.map((option) =>
    uniqueValues(splitValues(option.valuesText))
  );
  const cartesian = (arrays: string[][]): string[][] =>
    arrays.reduce(
      (acc, list) =>
        acc.flatMap((head) => list.map((value) => [...head, value])),
      [[]] as string[][]
    );
  return cartesian(lists).map((values) =>
    Object.fromEntries(
      defined.map((option, index) => [option.name.toLowerCase(), values[index]])
    )
  );
}

function variantCode(
  combination: Record<string, string>,
  slug: string,
  used: Set<string>
) {
  const base =
    [slug || "Sku", ...Object.values(combination)]
      .map((segment) =>
        segment
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      )
      .filter(Boolean)
      .join("-") || "SKU";
  let code = base;
  let suffix = 2;
  while (used.has(code.toLowerCase())) {
    code = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(code.toLowerCase());
  return code;
}

function initOptions(product: EditData | null | undefined) {
  return (product?.options ?? []).map((option) => ({
    key: crypto.randomUUID(),
    name: option.name,
    valuesText: option.values.map((value) => value.value).join(", "),
  }));
}

function combinationFromAssignments(
  optionNames: Map<string, string>,
  assignments: EditData["productSKUs"][number]["optionValues"]
) {
  const combination: Record<string, string> = {};
  for (const assignment of assignments) {
    const name = optionNames.get(assignment.optionId);
    if (name) {
      combination[name.toLowerCase()] = assignment.value;
    }
  }
  return combination;
}

function initSkus(product: EditData | null | undefined): SkuDraft[] {
  if (!product) {
    return [makeSku()];
  }
  const optionNames = new Map(
    product.options.map((option) => [option.id, option.name])
  );
  const skus = product.productSKUs.map((sku) => ({
    key: crypto.randomUUID(),
    code: sku.sku,
    price: String(sku.price),
    originalPrice: sku.originalPrice ? String(sku.originalPrice) : "",
    stock: String(sku.stock),
    imageUrl: sku.imageUrl,
    combination: combinationFromAssignments(optionNames, sku.optionValues),
  }));
  return skus.length > 0 ? skus : [makeSku()];
}

interface PricingVariantsCardProps {
  variantsEnabled: boolean;
  options: OptionDraft[];
  combos: Record<string, string>[];
  skus: SkuDraft[];
  onToggleVariants: (on: boolean) => void;
  onAddOption: () => void;
  onUpdateOption: (key: string, patch: Partial<OptionDraft>) => void;
  onRemoveOption: (key: string) => void;
  onAddSku: () => void;
  onUpdateSku: (key: string, patch: Partial<SkuDraft>) => void;
  onRemoveSku: (key: string) => void;
}

function PricingVariantsCard(props: PricingVariantsCardProps) {
  const definedOptions = props.options.filter((option) => option.name.trim());
  const everyOptionHasValues =
    definedOptions.length === 0 ||
    definedOptions.every((option) => splitValues(option.valuesText).length > 0);
  const optionNamesUnique =
    new Set(definedOptions.map((option) => option.name.trim().toLowerCase()))
      .size === definedOptions.length;
  const hasCombos = props.combos.length > 0;
  const tooManyCombos = props.combos.length > 100;
  let optionsAlert: string | null = null;
  if (!everyOptionHasValues) {
    optionsAlert = "Every option needs at least one value.";
  } else if (!optionNamesUnique) {
    optionsAlert = "Option names must be unique.";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pricing &amp; variants</CardTitle>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-muted-foreground text-sm">
            Add options such as <em>Colour</em> or <em>Storage</em> to create
            variants. Each combination becomes its own SKU with its own price
            and stock. No variants needed? Just set one SKU below.
          </p>
          <div className="flex items-center gap-2">
            <Switch
              id="has-variants"
              checked={props.variantsEnabled}
              onCheckedChange={(on) => props.onToggleVariants(on)}
              aria-label="This product has variants"
            />
            <Label htmlFor="has-variants" className="font-medium">
              This product has variants
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {props.variantsEnabled ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Variant options</p>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={props.onAddOption}
                disabled={props.options.length >= 3}
              >
                <PlusIcon />
                Add option
              </Button>
            </div>

            {props.options.map((option, optionIndex) => (
              <div
                key={option.key}
                className="grid items-end gap-2 sm:grid-cols-[1fr_1.5fr_auto]"
              >
                <Field label={optionIndex === 0 ? "Option name" : undefined}>
                  <Input
                    value={option.name}
                    onChange={(event) =>
                      props.onUpdateOption(option.key, {
                        name: event.target.value,
                      })
                    }
                    placeholder="e.g. Colour"
                    aria-label={`Option ${optionIndex + 1} name`}
                  />
                </Field>
                <Field
                  label={
                    optionIndex === 0 ? "Values (comma separated)" : undefined
                  }
                >
                  <Input
                    value={option.valuesText}
                    onChange={(event) =>
                      props.onUpdateOption(option.key, {
                        valuesText: event.target.value,
                      })
                    }
                    placeholder="e.g. Black, White, Blue"
                    aria-label={`Option ${optionIndex + 1} values`}
                    aria-invalid={
                      Boolean(option.name.trim()) &&
                      splitValues(option.valuesText).length === 0
                    }
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  aria-label={`Remove option ${optionIndex + 1}`}
                  onClick={() => props.onRemoveOption(option.key)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}

            {optionsAlert ? (
              <p className="text-destructive text-sm" role="alert">
                {optionsAlert}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">
              {props.variantsEnabled
                ? "Prices &amp; stock per variant"
                : "Price &amp; stock"}
            </p>
            {props.variantsEnabled ? null : (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={props.onAddSku}
              >
                <PlusIcon />
                Add SKU
              </Button>
            )}
          </div>

          {props.variantsEnabled && !hasCombos ? (
            <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
              Add an option name and its values above — combinations will appear
              here automatically.
            </p>
          ) : null}

          {tooManyCombos ? (
            <p
              className="rounded-md bg-destructive/10 p-3 text-destructive text-sm"
              role="alert"
            >
              These options create {props.combos.length} combinations —
              that&apos;s too many. Reduce the number of values.
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            {props.skus.map((sku, index) => (
              <fieldset
                key={sku.key}
                className="rounded-md border p-3"
                aria-label={props.variantsEnabled ? "Variant" : "SKU"}
              >
                {props.variantsEnabled ? (
                  <legend className="mb-2 flex items-center gap-2 font-medium text-sm">
                    <span className="truncate">
                      {Object.values(sku.combination).join(" / ")}
                    </span>
                    {index === 0 ? (
                      <Badge variant="secondary">default</Badge>
                    ) : null}
                  </legend>
                ) : null}
                <div className="grid items-end gap-2 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr]">
                  <Field label="SKU code">
                    <Input
                      value={sku.code}
                      onChange={(event) =>
                        props.onUpdateSku(sku.key, {
                          code: event.target.value,
                        })
                      }
                      placeholder={
                        props.variantsEnabled
                          ? "e.g. IPHONE-15-BLACK"
                          : "APL-IP15-128"
                      }
                      aria-label={`SKU code ${index + 1}`}
                      aria-invalid={!sku.code.trim()}
                    />
                  </Field>
                  <Field label="Price (Rs.)">
                    <Input
                      type="number"
                      min={0}
                      value={sku.price}
                      onChange={(event) =>
                        props.onUpdateSku(sku.key, {
                          price: event.target.value,
                        })
                      }
                      placeholder="0"
                      aria-label={`Price ${index + 1}`}
                      aria-invalid={sku.price === ""}
                    />
                  </Field>
                  <Field
                    label="MRP (Rs.)"
                    hint="Optional — the original price when discounted."
                  >
                    <Input
                      type="number"
                      min={0}
                      value={sku.originalPrice}
                      onChange={(event) =>
                        props.onUpdateSku(sku.key, {
                          originalPrice: event.target.value,
                        })
                      }
                      placeholder="Optional"
                      aria-label={`MRP ${index + 1}`}
                    />
                  </Field>
                  <Field label="Stock">
                    <Input
                      type="number"
                      min={0}
                      value={sku.stock}
                      onChange={(event) =>
                        props.onUpdateSku(sku.key, {
                          stock: event.target.value,
                        })
                      }
                      aria-label={`Stock ${index + 1}`}
                    />
                  </Field>
                </div>
                <div className="mt-2">
                  <Field
                    label="Variant photo URL"
                    hint="Optional — falls back to the main photo."
                  >
                    <Input
                      value={sku.imageUrl}
                      onChange={(event) =>
                        props.onUpdateSku(sku.key, {
                          imageUrl: event.target.value,
                        })
                      }
                      placeholder="/uploads/products/… or https://…"
                      aria-label={`Photo URL ${index + 1}`}
                    />
                  </Field>
                </div>
                {!props.variantsEnabled && props.skus.length > 1 ? (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-red-600 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
                      onClick={() => props.onRemoveSku(sku.key)}
                    >
                      <Trash2Icon />
                      Remove
                    </Button>
                  </div>
                ) : null}
              </fieldset>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const categories = trpc.admin.categories.list.useQuery({});
  const createProduct = trpc.admin.products.create.useMutation();
  const updateProduct = trpc.admin.products.update.useMutation();

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [baseImage, setBaseImage] = useState(product?.baseImage ?? "");
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? false);
  const [options, setOptions] = useState<OptionDraft[]>(() =>
    initOptions(product)
  );
  const [skus, setSkus] = useState<SkuDraft[]>(() => initSkus(product));
  const slugTouched = useRef(Boolean(product));

  const editing = Boolean(product);
  const variantsEnabled = options.length > 0;

  useEffect(() => {
    if (editing || slugTouched.current || !name.trim()) {
      return;
    }
    setSlug(slugify(name));
  }, [name, editing]);

  const combos = useMemo(() => computeCombos(options), [options]);

  useEffect(() => {
    const next = computeCombos(options);
    if (next.length === 0 || next.length > 100) {
      return;
    }
    setSkus((previous) => {
      const byKey = new Map(
        previous.map((sku) => [comboKey(sku.combination), sku])
      );
      const usedCodes = new Set(
        previous.map((sku) => sku.code.trim().toLowerCase())
      );
      return next.map((combination) => {
        const existing = byKey.get(comboKey(combination));
        if (existing) {
          return { ...existing, combination };
        }
        const code = variantCode(
          combination,
          slug.trim() || name.trim(),
          usedCodes
        );
        return {
          ...makeSku(),
          code,
          combination,
        };
      });
    });
  }, [options, slug, name]);

  const definedOptions = options.filter((option) => option.name.trim());
  const everyOptionHasValues =
    definedOptions.length === 0 ||
    definedOptions.every((option) => splitValues(option.valuesText).length > 0);
  const optionNamesUnique =
    new Set(definedOptions.map((option) => option.name.trim().toLowerCase()))
      .size === definedOptions.length;

  const skusValid =
    skus.length > 0 &&
    skus.every(
      (sku) =>
        sku.code.trim() !== "" &&
        sku.price !== "" &&
        Number.isFinite(Number(sku.price)) &&
        Number(sku.price) >= 0
    );

  const invalid =
    !name.trim() ||
    !categoryId ||
    !everyOptionHasValues ||
    !optionNamesUnique ||
    !skusValid ||
    combos.length > 100;

  const updateOption = (key: string, patch: Partial<OptionDraft>) =>
    setOptions((previous) =>
      previous.map((option) =>
        option.key === key ? { ...option, ...patch } : option
      )
    );

  const addOption = () => {
    if (options.length < 3) {
      setOptions((previous) => [...previous, makeOption()]);
    }
  };

  const removeOption = (key: string) => {
    setOptions((previous) => previous.filter((option) => option.key !== key));
  };

  const updateSku = (key: string, patch: Partial<SkuDraft>) =>
    setSkus((previous) =>
      previous.map((sku) => (sku.key === key ? { ...sku, ...patch } : sku))
    );

  const toggleVariants = (on: boolean) => {
    if (on) {
      if (options.length === 0) {
        setOptions([makeOption()]);
      }
      return;
    }
    setOptions([]);
  };

  const save = async () => {
    const optionsPayload = definedOptions.map((option) => ({
      name: option.name.trim(),
      values: uniqueValues(splitValues(option.valuesText)),
    }));
    const skusPayload = skus.map((sku) => ({
      code: sku.code.trim(),
      price: Number(sku.price),
      originalPrice: sku.originalPrice ? Number(sku.originalPrice) : null,
      stock: Number(sku.stock || 0),
      imageUrl: sku.imageUrl.trim() || undefined,
      optionValues: optionsPayload.map((option) => ({
        option: option.name,
        value: sku.combination[option.name.toLowerCase()] ?? "",
      })),
    }));

    const input = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || "n/a",
      categoryId,
      baseImage: baseImage.trim(),
      isPublished,
      options: optionsPayload,
      skus: skusPayload,
    };

    try {
      if (editing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...input });
      } else {
        await createProduct.mutateAsync(input);
      }
    } catch (error) {
      toast.add({
        title: "Couldn't save product",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
      return;
    }

    await utils.admin.products.list.invalidate();
    toast.add({
      title: editing ? "Product updated" : "Product created",
      type: "success",
    });
    router.push("/admin/products");
    router.refresh();
  };

  const isSaving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Products
        </Link>
        <h1 className="mt-1 font-bold text-2xl tracking-tight">
          {editing ? "Edit product" : "Add product"}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {editing
            ? "Update the details, photo and variants, then save your changes."
            : "Details, photo and variants — everything you need to go live."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="product-name">
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. iPhone 15"
              aria-invalid={!name.trim()}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="product-slug"
            hint={
              editing
                ? undefined
                : "Auto-generated from the name — tweak it if you like."
            }
          >
            <Input
              id="product-slug"
              value={slug}
              onChange={(event) => {
                slugTouched.current = true;
                setSlug(event.target.value);
              }}
              placeholder={name ? slugify(name) : "auto-generated"}
            />
          </Field>

          <Field label="Category" htmlFor="product-category">
            {categories.data && categories.data.length > 0 ? (
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(value ?? "")}
              >
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Select a category">
                    {(value) =>
                      value
                        ? (categories.data?.find(
                            (category) => category.id === value
                          )?.name ?? value)
                        : "Select a category"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.data.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
                No categories yet — create one under{" "}
                <Link
                  href="/admin/categories"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Categories
                </Link>{" "}
                first.
              </p>
            )}
          </Field>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium text-sm">Published</p>
              <p className="text-muted-foreground text-xs">
                Visible to customers on the storefront.
              </p>
            </div>
            <Switch
              checked={isPublished}
              onCheckedChange={setIsPublished}
              aria-label="Published"
            />
          </div>

          <Field
            label="Description"
            htmlFor="product-description"
            className="sm:col-span-2"
            hint="What makes this product worth buying?"
          >
            <Textarea
              id="product-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the product…"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Photo</CardTitle>
          {baseImage ? <Badge variant="secondary">1 photo</Badge> : null}
        </CardHeader>
        <CardContent>
          <ProductImageField
            value={baseImage}
            onChange={setBaseImage}
            hint="Upload a photo, or paste an image URL. Used on cards and as the default for variants."
          />
        </CardContent>
      </Card>

      <PricingVariantsCard
        variantsEnabled={variantsEnabled}
        options={options}
        combos={combos}
        skus={skus}
        onToggleVariants={toggleVariants}
        onAddOption={addOption}
        onUpdateOption={updateOption}
        onRemoveOption={removeOption}
        onAddSku={() => setSkus((previous) => [...previous, makeSku()])}
        onUpdateSku={updateSku}
        onRemoveSku={(key) =>
          setSkus((previous) => previous.filter((row) => row.key !== key))
        }
      />

      <div className="sticky bottom-0 z-10 -mx-1 rounded-md border bg-background/95 px-3 py-3 backdrop-blur sm:-mx-2 sm:px-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            type="button"
            render={<Link href="/admin/products" />}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={invalid || isSaving}>
            {isSaving ? <Loader2Icon className="animate-spin" /> : null}
            {editing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>
    </div>
  );
}
