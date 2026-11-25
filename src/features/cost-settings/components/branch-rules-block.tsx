"use client";

import { useId, useState } from "react";
import { Loader2, Pencil, Plus, Route, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useDeleteBranchRule, useSaveBranchRule } from "../hooks/use-cost-settings";
import { formatDay } from "../lib/format";
import type { BranchRule, BranchRuleInput } from "../types/cost-settings.types";

const supplierName = (rule: BranchRule) => rule.supplier_name || `NIT ${rule.supplier_nit}`;

/**
 * Which branch of a supplier the quoter reads its quotation from, per operation center. Whoever
 * manages adds, edits, switches off and deletes rules; the rest read them.
 */
export default function BranchRulesBlock({ rules, canManage }: { rules: BranchRule[]; canManage: boolean }) {
  const save = useSaveBranchRule();
  const [editing, setEditing] = useState<BranchRule | "new" | null>(null);
  const [deleting, setDeleting] = useState<BranchRule | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const toggle = (rule: BranchRule, active: boolean) => {
    setToggling(rule.id);
    save.mutate(
      { id: rule.id, input: { is_active: active } },
      {
        onSuccess: () => toast.success(`Regla de ${supplierName(rule)} ${active ? "activada" : "desactivada"}.`),
        onError: (failure) => toast.error(errorMessage(failure)),
        onSettled: () => setToggling(null),
      }
    );
  };

  return (
    <section aria-labelledby="cost-branch-rules" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h2 id="cost-branch-rules" className="text-base font-semibold">
            Sucursal del proveedor por C.O.
          </h2>
          <p className="max-w-prose text-[13px] text-text-secondary">
            Para cada referencia se toma la cotización de la sucursal del C.O.; si no está, la general. Nacional toma la mayor.
          </p>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setEditing("new")} className="max-md:h-11">
            <Plus aria-hidden="true" /> Agregar regla
          </Button>
        )}
      </div>

      {rules.length === 0 ? (
        <StatePanel icon={Route} title="Ningún proveedor tiene regla de sucursal">
          Sin regla, la cotización de cada proveedor se toma de su sucursal general.
        </StatePanel>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <caption className="sr-only">Sucursal del proveedor por C.O.</caption>
            <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              <tr>
                <th scope="col" className="px-3 py-2">Proveedor</th>
                <th scope="col" className="px-3 py-2">Sucursal general</th>
                <th scope="col" className="px-3 py-2">Por C.O.</th>
                <th scope="col" className="px-3 py-2">Activa</th>
                <th scope="col" className="px-3 py-2">Nota</th>
                <th scope="col" className="px-3 py-2">Actualizada</th>
                {canManage && (
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map((rule) => (
                <tr key={rule.id} className={cn(!rule.is_active && "text-text-secondary")}>
                  <td className="max-w-64 px-3 py-2">
                    <span className="block truncate font-medium" title={supplierName(rule)}>{supplierName(rule)}</span>
                    <span className="block font-mono text-xs text-text-secondary">NIT {rule.supplier_nit}</span>
                  </td>
                  <td className="px-3 py-2 font-mono">{rule.general_branch}</td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap gap-1">
                      {Object.entries(rule.center_branches).map(([center, branch]) => (
                        <Badge key={center} tone="neutral" className="px-1.5 py-0 font-mono text-xs">
                          C.O. {center} → {branch}
                        </Badge>
                      ))}
                      {Object.keys(rule.center_branches).length === 0 && "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {canManage ? (
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(active) => toggle(rule, active)}
                        disabled={toggling === rule.id}
                        aria-label={`Regla de ${supplierName(rule)} activa`}
                      />
                    ) : (
                      <Badge tone={rule.is_active ? "success" : "neutral"}>{rule.is_active ? "Activa" : "Inactiva"}</Badge>
                    )}
                  </td>
                  <td className="max-w-56 px-3 py-2 text-[13px]">
                    <span className="line-clamp-2" title={rule.note ?? undefined}>{rule.note || "—"}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[13px] text-text-secondary">
                    {formatDay(rule.updated_at ?? rule.created_at)}
                    {(rule.updated_by ?? rule.created_by) && <span className="block">{rule.updated_by ?? rule.created_by}</span>}
                  </td>
                  {canManage && (
                    <td className="whitespace-nowrap px-2 py-1.5 text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(rule)} aria-label={`Editar la regla de ${supplierName(rule)}`} className="max-md:size-11">
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(rule)} aria-label={`Eliminar la regla de ${supplierName(rule)}`} className="max-md:size-11">
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && !save.isPending && setEditing(null)}
        title={editing === "new" ? "Agregar regla" : editing ? `Regla de ${supplierName(editing)}` : "Regla"}
        description="La sucursal del proveedor de la que se toma su cotización en cada C.O. Los C.O. que no estén usan la sucursal general."
        isForm
      >
        {editing !== null && <RuleForm key={editing === "new" ? "new" : editing.id} rule={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <DeleteRuleDialog rule={deleting} onClose={() => setDeleting(null)} />
    </section>
  );
}

interface Row {
  key: number;
  center: string;
  branch: string;
}

function RuleForm({ rule, onDone }: { rule: BranchRule | null; onDone: () => void }) {
  const id = useId();
  const save = useSaveBranchRule();
  const [nit, setNit] = useState(rule?.supplier_nit ?? "");
  const [name, setName] = useState(rule?.supplier_name ?? "");
  const [general, setGeneral] = useState(rule?.general_branch ?? "001");
  const [rows, setRows] = useState<Row[]>(() => {
    const entries = Object.entries(rule?.center_branches ?? {});
    return entries.length > 0 ? entries.map(([center, branch], index) => ({ key: index, center, branch })) : [{ key: 0, center: "", branch: "" }];
  });
  const [note, setNote] = useState(rule?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const setRow = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const addRow = () => setRows((current) => [...current, { key: Math.max(-1, ...current.map((row) => row.key)) + 1, center: "", branch: "" }]);
  const removeRow = (key: number) => setRows((current) => current.filter((row) => row.key !== key));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found: Record<string, string> = {};
    if (!nit.trim()) found.nit = "Escribe el NIT del proveedor.";
    if (!general.trim()) found.general = "Escribe la sucursal general.";
    const filled = rows.filter((row) => row.center.trim() || row.branch.trim());
    const seen = new Set<string>();
    for (const row of filled) {
      const center = row.center.trim();
      if (!center || !row.branch.trim()) found[`row-${row.key}`] = "Escribe el C.O. y la sucursal.";
      else if (seen.has(center)) found[`row-${row.key}`] = `El C.O. ${center} ya está en otra fila.`;
      seen.add(center);
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const centerBranches = Object.fromEntries(filled.map((row) => [row.center.trim(), row.branch.trim()]));
    const input: BranchRuleInput = {
      supplier_nit: nit.trim(),
      supplier_name: name.trim() || null,
      general_branch: general.trim(),
      center_branches: centerBranches,
      note: note.trim() || null,
    };
    // An edit sends only what changed.
    const changes: Partial<BranchRuleInput> = rule
      ? Object.fromEntries(
          Object.entries(input).filter(([key, value]) => {
            const before = (rule as unknown as Record<string, unknown>)[key] ?? null;
            return JSON.stringify(before) !== JSON.stringify(value ?? null);
          })
        )
      : input;
    if (rule && Object.keys(changes).length === 0) {
      onDone();
      return;
    }
    save.mutate(
      { id: rule?.id ?? null, input: changes },
      {
        onSuccess: () => {
          toast.success(rule ? "Regla actualizada." : "Regla agregada.");
          onDone();
        },
        onError: (failure) => setFormError(errorMessage(failure)),
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <fieldset disabled={save.isPending} className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="NIT del proveedor" htmlFor={`${id}-nit`} error={errors.nit}>
            <Input
              id={`${id}-nit`}
              value={nit}
              onChange={(event) => setNit(event.target.value)}
              inputMode="numeric"
              disabled={rule !== null}
              aria-invalid={errors.nit ? true : undefined}
              aria-describedby={errors.nit ? `${id}-nit-error` : undefined}
              className="font-mono max-md:h-11"
            />
          </Field>
          <Field label="Nombre" htmlFor={`${id}-name`} optional>
            <Input id={`${id}-name`} value={name} maxLength={200} onChange={(event) => setName(event.target.value)} className="max-md:h-11" />
          </Field>
        </div>
        <Field label="Sucursal general" htmlFor={`${id}-general`} hint="La que se usa en los C.O. que no están abajo." error={errors.general}>
          <Input
            id={`${id}-general`}
            value={general}
            onChange={(event) => setGeneral(event.target.value)}
            aria-invalid={errors.general ? true : undefined}
            aria-describedby={errors.general ? `${id}-general-error` : `${id}-general-hint`}
            className="w-32 font-mono max-md:h-11"
          />
        </Field>

        <fieldset className="min-w-0 space-y-2">
          <legend className="mb-1.5 text-[13px] font-medium">Sucursal por C.O.</legend>
          {rows.map((row, index) => {
            const error = errors[`row-${row.key}`];
            return (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={row.center}
                    onChange={(event) => setRow(row.key, { center: event.target.value })}
                    placeholder="C.O."
                    aria-label={`C.O. de la fila ${index + 1}`}
                    aria-invalid={error ? true : undefined}
                    className="w-24 font-mono max-md:h-11"
                  />
                  <span aria-hidden="true" className="text-text-secondary">→</span>
                  <Input
                    value={row.branch}
                    onChange={(event) => setRow(row.key, { branch: event.target.value })}
                    placeholder="Sucursal"
                    aria-label={`Sucursal de la fila ${index + 1}`}
                    aria-invalid={error ? true : undefined}
                    className="w-28 font-mono max-md:h-11"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeRow(row.key)} aria-label={`Quitar la fila ${index + 1}`} className="max-md:size-11">
                    <X aria-hidden="true" />
                  </Button>
                </div>
                {error && <p className="text-[13px] text-danger">{error}</p>}
              </div>
            );
          })}
          <Button variant="ghost" size="sm" onClick={addRow} className="max-md:h-11">
            <Plus aria-hidden="true" /> Agregar C.O.
          </Button>
        </fieldset>

        <Field label="Nota" htmlFor={`${id}-note`} optional>
          <Textarea id={`${id}-note`} rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </fieldset>

      <DialogError message={formError} />
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={save.isPending} className="max-md:h-11">
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending} className="max-md:h-11">
          {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {rule ? "Guardar" : "Agregar regla"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteRuleDialog({ rule, onClose }: { rule: BranchRule | null; onClose: () => void }) {
  const remove = useDeleteBranchRule();
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open={rule !== null}
      onOpenChange={(open) => {
        if (!open && !remove.isPending) {
          setError(null);
          onClose();
        }
      }}
      title={rule ? `¿Eliminar la regla de ${supplierName(rule)}?` : "Eliminar regla"}
      description="Su cotización se volverá a tomar de la sucursal general en todos los C.O. Para dejarla en pausa sin perderla, apágala con el interruptor."
    >
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={remove.isPending}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          disabled={remove.isPending}
          onClick={() =>
            rule &&
            remove.mutate(rule.id, {
              onSuccess: () => {
                toast.success(`Se eliminó la regla de ${supplierName(rule)}.`);
                setError(null);
                onClose();
              },
              onError: (failure) => setError(errorMessage(failure)),
            })
          }
        >
          {remove.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Eliminar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
