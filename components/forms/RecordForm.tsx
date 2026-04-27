"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AmountInput } from "@/components/shared/AmountInput";
import { CurrencySelect } from "@/components/shared/CurrencySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormField, ModuleConfig } from "@/lib/modules";
import { addDaysISO, todayISO } from "@/lib/utils/dates";

type FormValues = Record<string, string | number | boolean>;

type ReferenceFieldConfig = {
  apiPath: string;
  detailBasePath?: string;
  createPath?: string;
  placeholder: string;
  createLabel: string;
  openLabel: string;
};

type ReferenceOption = {
  value: string;
  label: string;
};

function getReferenceFieldConfig(config: ModuleConfig, field: FormField): ReferenceFieldConfig | null {
  const loweredLabel = field.label.toLowerCase();
  const isCustomer = field.name === "customer_id" || loweredLabel.includes("customer");
  const isVendor = field.name === "vendor_id" || loweredLabel.includes("vendor");

  if (field.name === "contact_id") {
    if (isCustomer || ["invoices", "quotations", "sales-orders", "credit-notes", "payments-received", "projects"].includes(config.key)) {
      return {
        apiPath: "/api/v1/customers",
        detailBasePath: "/customers",
        createPath: "/customers/new",
        placeholder: "Select a customer",
        createLabel: "New customer",
        openLabel: "Open customer"
      };
    }

    return {
      apiPath: "/api/v1/vendors",
      detailBasePath: "/vendors",
      createPath: "/vendors/new",
      placeholder: "Select a vendor",
      createLabel: "New vendor",
      openLabel: "Open vendor"
    };
  }

  if (isCustomer) {
    return {
      apiPath: "/api/v1/customers",
      detailBasePath: "/customers",
      createPath: "/customers/new",
      placeholder: "Select a customer",
      createLabel: "New customer",
      openLabel: "Open customer"
    };
  }

  if (isVendor) {
    return {
      apiPath: "/api/v1/vendors",
      detailBasePath: "/vendors",
      createPath: "/vendors/new",
      placeholder: "Select a vendor",
      createLabel: "New vendor",
      openLabel: "Open vendor"
    };
  }

  if (field.name === "bank_account_id") {
    return {
      apiPath: "/api/v1/bank-accounts",
      detailBasePath: "/bank-accounts",
      createPath: "/bank-accounts/new",
      placeholder: "Select a bank account",
      createLabel: "New bank account",
      openLabel: "Open bank account"
    };
  }

  if (field.name === "account_id" || field.name === "payment_account_id" || field.name === "category_account_id") {
    return {
      apiPath: "/api/v1/accounts",
      createPath: "/chart-of-accounts/new",
      placeholder: "Select an account",
      createLabel: "New account",
      openLabel: "Open chart of accounts"
    };
  }

  if (field.name === "project_id") {
    return {
      apiPath: "/api/v1/projects",
      detailBasePath: "/projects",
      createPath: "/projects/new",
      placeholder: "Select a project",
      createLabel: "New project",
      openLabel: "Open project"
    };
  }

  if (field.name === "tax_rate_id") {
    return {
      apiPath: "/api/v1/taxes",
      createPath: "/settings/taxes/new",
      placeholder: "Select a tax rate",
      createLabel: "New tax rate",
      openLabel: "Open taxes"
    };
  }

  return null;
}

function optionLabel(entry: Record<string, unknown>) {
  return String(
    entry.display_name ??
      entry.name ??
      entry.company_name ??
      entry.title ??
      entry.code ??
      entry.email ??
      entry.id ??
      ""
  );
}

function schemaForField(field: FormField) {
  if (field.type === "number" || field.type === "money") {
    return z.coerce.number().min(field.required ? 0.01 : 0);
  }
  if (field.type === "checkbox") {
    return z.coerce.boolean().default(false);
  }
  if (field.type === "email") {
    return field.required ? z.string().email() : z.string().email().or(z.literal("")).default("");
  }
  return field.required ? z.string().min(1) : z.string().default("");
}

function defaultValue(field: FormField) {
  if (
    field.name === "issue_date" ||
    field.name === "expense_date" ||
    field.name === "entry_date" ||
    field.name === "work_date" ||
    field.name === "dispatch_date" ||
    field.name === "submission_date" ||
    field.name === "assessment_date" ||
    field.name === "imported_on" ||
    field.name === "statement_date"
  ) {
    return todayISO();
  }
  if (field.name === "due_date") {
    return addDaysISO(30);
  }
  if (field.name === "currency" || field.name === "base_currency") {
    return "INR";
  }
  if (field.name === "timezone") {
    return "Asia/Kolkata";
  }
  if (field.name === "preferred_language") {
    return "en";
  }
  if (field.name === "fiscal_year_start") {
    return "4";
  }
  if (field.name === "state_code") {
    return "27";
  }
  if (field.type === "checkbox") {
    return false;
  }
  if (field.type === "number" || field.type === "money") {
    return 0;
  }
  return "";
}

export function RecordForm({ config }: { config: ModuleConfig }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const loadId = editId ?? duplicateId;
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [referenceOptions, setReferenceOptions] = useState<Record<string, ReferenceOption[]>>({});

  const referenceFields = useMemo(
    () =>
      config.formFields.reduce<Record<string, ReferenceFieldConfig>>((result, field) => {
        const reference = getReferenceFieldConfig(config, field);
        if (reference) {
          result[field.name] = reference;
        }
        return result;
      }, {}),
    [config]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEditId(params.get("edit"));
    setDuplicateId(params.get("duplicate"));
  }, []);

  const schema = useMemo(() => {
    const shape = config.formFields.reduce<Record<string, z.ZodType<unknown>>>((fields, field) => {
      fields[field.name] = schemaForField(field);
      return fields;
    }, {});
    return z.object(shape);
  }, [config.formFields]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: config.formFields.reduce<FormValues>((values, field) => {
      values[field.name] = defaultValue(field);
      return values;
    }, {})
  });

  useEffect(() => {
    const controller = new AbortController();
    const entries = Object.entries(referenceFields);

    if (!entries.length) {
      setReferenceOptions({});
      return () => controller.abort();
    }

    const loadReferenceOptions = async () => {
      const loaded = await Promise.all(
        entries.map(async ([fieldName, reference]) => {
          const response = await fetch(reference.apiPath, { signal: controller.signal });
          if (!response.ok) {
            return [fieldName, []] as const;
          }

          const payload = (await response.json()) as { data?: unknown };
          const rows = Array.isArray(payload.data) ? payload.data : [];
          const options = rows
            .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null && !Array.isArray(row))
            .map((row) => ({
              value: String(row.id ?? ""),
              label: optionLabel(row)
            }))
            .filter((option) => option.value && option.label);

          return [fieldName, options] as const;
        })
      );

      setReferenceOptions(Object.fromEntries(loaded));
    };

    loadReferenceOptions().catch(() => setReferenceOptions({}));
    return () => controller.abort();
  }, [referenceFields]);

  useEffect(() => {
    const controller = new AbortController();

    if (!loadId) {
      return () => controller.abort();
    }

    const loadRecord = async () => {
      setLoadingRecord(true);
      const itemPath = config.apiPath.split("?")[0];
      const response = await fetch(`${itemPath}/${loadId}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error("The record could not be loaded.");
      }

      const payload = (await response.json()) as { data?: Record<string, unknown> };
      const record = payload.data ?? {};
      const nextValues = config.formFields.reduce<FormValues>((values, field) => {
        const value = record[field.name];
        values[field.name] = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : defaultValue(field);
        return values;
      }, {});
      form.reset(nextValues);
      setLoadingRecord(false);
    };

    loadRecord().catch((error) => {
      setLoadingRecord(false);
      toast.error(error instanceof Error ? error.message : "The record could not be loaded.");
    });

    return () => controller.abort();
  }, [config.apiPath, config.formFields, form, loadId]);

  const submit = form.handleSubmit(async (values) => {
    const itemPath = config.apiPath.split("?")[0];
    const response = await fetch(editId ? `${itemPath}/${editId}` : config.apiPath, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      toast.error("The record could not be saved.");
      return;
    }

    toast.success(`${config.entityName} saved.`);
    form.reset();
    router.push(config.listPath ?? `/${config.key}`);
  });

  if (config.formFields.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        This workflow is powered by import, API, and table actions. Use the module page controls to continue.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-lg border bg-card p-5 md:grid-cols-2">
      {loadingRecord ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">Loading record...</div> : null}
      {config.formFields.map((field) => (
        <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <div className="mt-2">
            {referenceFields[field.name] ? (
              <select
                id={field.name}
                {...form.register(field.name)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{referenceFields[field.name].placeholder}</option>
                {(referenceOptions[field.name] ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <Textarea id={field.name} {...form.register(field.name)} />
            ) : field.type === "select" ? (
              <select id={field.name} {...form.register(field.name)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.name === "currency" ? (
              <CurrencySelect value={String(form.watch(field.name) ?? "USD")} onChange={(value) => form.setValue(field.name, value)} />
            ) : field.type === "money" ? (
              <AmountInput id={field.name} type="number" step="0.01" {...form.register(field.name)} />
            ) : field.type === "checkbox" ? (
              <input id={field.name} type="checkbox" className="h-4 w-4 rounded border-input accent-sky-600" {...form.register(field.name)} />
            ) : (
              <Input id={field.name} type={field.type} {...form.register(field.name)} />
            )}
          </div>
          {referenceFields[field.name] ? (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {referenceFields[field.name].createPath ? (
                <Link href={referenceFields[field.name].createPath ?? "#"} className="text-primary underline underline-offset-2">
                  {referenceFields[field.name].createLabel}
                </Link>
              ) : null}
              {referenceFields[field.name].detailBasePath && form.watch(field.name) ? (
                <Link
                  href={`${referenceFields[field.name].detailBasePath}/${String(form.watch(field.name))}`}
                  className="text-muted-foreground underline underline-offset-2"
                >
                  {referenceFields[field.name].openLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
          {form.formState.errors[field.name]?.message ? (
            <p className="mt-1 text-xs text-destructive">{String(form.formState.errors[field.name]?.message)}</p>
          ) : null}
        </div>
      ))}
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button variant="secondary" type="button" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit">{editId ? `Update ${config.entityName}` : duplicateId ? `Duplicate ${config.entityName}` : `Save ${config.entityName}`}</Button>
      </div>
    </form>
  );
}
