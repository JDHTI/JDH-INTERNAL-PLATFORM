"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CloudOff,
  Download,
  FileQuestion,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  RotateCw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useDeleteEvidence, useDeletePlan, useNextAttempt, usePlan, useUploadEvidence } from "../hooks/use-action-plans";
import { usePlanLabels } from "../hooks/use-plan-labels";
import { hasAnalysis, hasCorrections } from "../lib/labels";
import { downloadEvidence } from "../services/action-plans.service";
import type { Activity, Correction, Plan, PlanDetail, PlanEvent, PlanFile } from "../types/action-plans.types";
import { OverdueBadge, PlanEffectivenessBadge, PlanStatusBadge } from "./plan-badges";
import { ActivitiesDialog, CausesDialog, CorrectionsDialog, DoneDialog, EditHeaderDialog, RateDialog } from "./plan-forms";

const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" });
const dateOf = (iso: string | null) => (iso ? dateFormat.format(new Date(`${iso}T00:00:00Z`)) : "");
const dateTimeOf = (iso: string | null) => (iso ? dateTimeFormat.format(new Date(iso)) : "");
// A moment (done_at) read as the calendar day it was in Bogotá, not in UTC.
const dayFormat = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota" });
const dayOf = (iso: string | null) => (iso ? dayFormat.format(new Date(iso)) : "");

type Dialog =
  | { kind: "header" }
  | { kind: "corrections" }
  | { kind: "causes" }
  | { kind: "activities" }
  | { kind: "done"; row: Correction | Activity; rowKind: "corrección" | "actividad" }
  | { kind: "rate"; activity: Activity }
  | { kind: "delete" }
  | { kind: "attempt" };

/**
 * One action, in the sections of the P.04.F.02 format: registration, immediate
 * correction, analysis, action plan and follow-up. Calidad edits; a responsible
 * marks their rows as done and uploads evidence. The API decides which of those
 * a person may do (`access`), and this screen offers only that.
 */
export default function PlanDetailScreen({
  planId,
  backHref,
  backLabel,
  caseArea,
}: {
  planId: string;
  backHref: string;
  backLabel: string;
  /** The area whose PQRSF the case of the action is read in, when this screen knows it. */
  caseArea?: string;
}) {
  const detail = usePlan(planId);
  const caseHref = caseArea ? (caseId: string) => `/${caseArea}/pqrsf/${caseId}` : undefined;
  const [dialog, setDialog] = useState<Dialog | null>(null);
  useBreadcrumbLabel(backHref + "/" + planId, detail.data?.plan.code);

  const back = (
    <Link href={backHref as never} className="inline-flex items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary max-md:min-h-11">
      {backLabel}
    </Link>
  );

  if (detail.isPending) return <Skeleton />;
  if (detail.isError) {
    const status = detail.error instanceof ApiError ? detail.error.status : 0;
    const missing = status === 404 || status === 422;
    return (
      <div className="space-y-4">
        {back}
        {missing ? (
          <StatePanel icon={FileQuestion} title="Esta acción no existe">
            El enlace puede estar incompleto o la acción se eliminó.
          </StatePanel>
        ) : status === 403 ? (
          <StatePanel icon={Lock} title="No tienes acceso a esta acción">
            Ves las acciones donde eres responsable. Si necesitas esta, pídeselo a Calidad.
          </StatePanel>
        ) : (
          <StatePanel
            icon={CloudOff}
            tone="danger"
            title="No se cargó la acción"
            action={
              <Button variant="outline" onClick={() => detail.refetch()}>
                Reintentar
              </Button>
            }
          >
            {errorMessage(detail.error)}
          </StatePanel>
        )}
      </div>
    );
  }

  const { plan, access, files, events, similar } = detail.data;
  const close = () => setDialog(null);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {back}
        <Header plan={plan} access={access} onDialog={setDialog} caseHref={caseHref} />
        {similar > 0 && (
          <p role="status" className="flex items-start gap-2 rounded-md bg-warning-badge px-3 py-2 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Antecedentes: este cliente tiene <strong className="tabular font-semibold">{similar}</strong>{" "}
              {similar === 1 ? "acción anterior" : "acciones anteriores"} por la misma causal.
            </span>
          </p>
        )}
        {plan.imported && (
          <div className="rounded-md bg-canvas-subtle px-3 py-2 text-sm">
            <p>
              Esta acción viene del Excel del SIG de 2026.
              {plan.import_issues.length > 0 && " Al importarla se encontró lo siguiente:"}
            </p>
            {plan.import_issues.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px]">
                {plan.import_issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Registration plan={plan} canManage={access.can_manage} onEdit={() => setDialog({ kind: "header" })} />

      {hasCorrections(plan.action_type) && (
        <Rows
          heading="Corrección inmediata"
          empty="Todavía no hay correcciones."
          plan={plan}
          rows={plan.corrections}
          kind="corrección"
          files={files}
          access={access}
          onEdit={() => setDialog({ kind: "corrections" })}
          onDone={(row) => setDialog({ kind: "done", row, rowKind: "corrección" })}
        />
      )}

      {hasAnalysis(plan.action_type) && <Analysis plan={plan} canManage={access.can_manage} onEdit={() => setDialog({ kind: "causes" })} />}

      <Rows
        heading="Plan de acción"
        empty="Todavía no hay actividades."
        plan={plan}
        rows={plan.activities_detail}
        kind="actividad"
        files={files}
        access={access}
        onEdit={() => setDialog({ kind: "activities" })}
        onDone={(row) => setDialog({ kind: "done", row, rowKind: "actividad" })}
      />

      <FollowUp plan={plan} canManage={access.can_manage} onRate={(activity) => setDialog({ kind: "rate", activity })} />

      <Evidence plan={plan} files={files} canUpload={access.can_manage || access.is_responsible} canRemove={access.can_manage || access.is_responsible} />

      <History events={events} />

      {dialog?.kind === "header" && <EditHeaderDialog plan={plan} onClose={close} />}
      {dialog?.kind === "corrections" && <CorrectionsDialog plan={plan} onClose={close} />}
      {dialog?.kind === "causes" && <CausesDialog plan={plan} onClose={close} />}
      {dialog?.kind === "activities" && <ActivitiesDialog plan={plan} onClose={close} />}
      {dialog?.kind === "done" && <DoneDialog plan={plan} row={dialog.row} kind={dialog.rowKind} onClose={close} />}
      {dialog?.kind === "rate" && <RateDialog plan={plan} activity={dialog.activity} onClose={close} />}
      {dialog?.kind === "delete" && <DeletePlan plan={plan} backHref={backHref} onClose={close} />}
      {dialog?.kind === "attempt" && <NextAttemptDialog plan={plan} backHref={backHref} onClose={close} />}
    </div>
  );
}

// ── Header ──

function Header({
  plan,
  access,
  onDialog,
  caseHref,
}: {
  plan: Plan;
  access: PlanDetail["access"];
  onDialog: (dialog: Dialog) => void;
  caseHref?: (caseId: string) => string;
}) {
  const labels = usePlanLabels();
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-mono text-2xl font-semibold tracking-tight break-all max-md:text-xl">{plan.code}</h1>
          <PlanStatusBadge status={plan.status} />
          <PlanEffectivenessBadge effectiveness={plan.effectiveness} />
          <OverdueBadge count={plan.overdue} />
        </div>
        <p className="text-sm text-text-secondary">
          {labels.action_types(plan.action_type)} · {labels.origins(plan.origin)} · {plan.process.code} {plan.process.name} · Fecha{" "}
          <span className="tabular">{dateOf(plan.reported_on)}</span>
          {plan.attempt > 1 && <> · Intento <span className="tabular">{plan.attempt}</span></>}
        </p>
        {plan.case_id && plan.case_code && (
          <p className="text-sm">
            <span className="text-text-secondary">Caso de PQRSF </span>
            {caseHref ? (
              <Link href={caseHref(plan.case_id) as never} className="rounded-sm font-mono underline underline-offset-4">
                {plan.case_code}
              </Link>
            ) : (
              <span className="font-mono">{plan.case_code}</span>
            )}
          </p>
        )}
      </div>
      {access.can_manage && (
        <div className="flex flex-wrap gap-2 md:justify-end">
          {plan.effectiveness === "no" && (
            <Button variant="secondary" className="max-md:h-11" onClick={() => onDialog({ kind: "attempt" })}>
              <RotateCw aria-hidden="true" />
              Nuevo intento
            </Button>
          )}
          <Button variant="outline" className="max-md:h-11" onClick={() => onDialog({ kind: "header" })}>
            <Pencil aria-hidden="true" />
            Editar registro
          </Button>
          <Button variant="danger" className="max-md:h-11" onClick={() => onDialog({ kind: "delete" })}>
            <Trash2 aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      )}
    </header>
  );
}

// ── Sections ──

function SectionHeading({ id, title, action }: { id: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {action}
    </div>
  );
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="max-md:h-11" onClick={onClick}>
      <Pencil aria-hidden="true" />
      {label}
    </Button>
  );
}

function Registration({ plan, canManage, onEdit }: { plan: Plan; canManage: boolean; onEdit: () => void }) {
  const id = useId();
  const labels = usePlanLabels();
  const facts: [string, React.ReactNode][] = [
    ["Calificación", labels.ratings(plan.rating)],
    ["NIT", plan.reporter_nit && <span className="tabular">{plan.reporter_nit}</span>],
    ["Quién identifica", plan.reporter_name],
    ["Empresa y cargo", plan.reporter_company_role],
    ["Ciudad", plan.city],
    ["Registró", [plan.registered_by_name, plan.registered_by_position].filter(Boolean).join(", ")],
    ["Fecha de registro", plan.registered_on && <span className="tabular">{dateOf(plan.registered_on)}</span>],
    ["Registro fotográfico", plan.has_photos ? "Sí" : "No"],
    ["Antecedentes", plan.has_history ? "Sí" : "No"],
  ];
  return (
    <section aria-labelledby={id} className="space-y-3">
      <SectionHeading id={id} title="Registro" action={canManage && <EditButton label="Editar" onClick={onEdit} />} />
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0 space-y-0.5">
            <dt className="text-[13px] text-text-secondary">{label}</dt>
            <dd className="break-words">{value || <span className="text-text-secondary">Sin dato</span>}</dd>
          </div>
        ))}
      </dl>
      {plan.unmet_requirement && (
        <div className="space-y-0.5 text-sm">
          <h3 className="text-[13px] text-text-secondary">Requisito incumplido</h3>
          <p className="max-w-prose whitespace-pre-wrap">{plan.unmet_requirement}</p>
        </div>
      )}
      <div className="space-y-0.5 text-sm">
        <h3 className="text-[13px] text-text-secondary">Hallazgo</h3>
        <p className="max-w-prose whitespace-pre-wrap">{plan.finding || <span className="text-text-secondary">Sin hallazgo</span>}</p>
      </div>
    </section>
  );
}

/** Corrections and activities share a card: the text, who answers, when, and whether it is done. */
function Rows({
  heading,
  empty,
  plan,
  rows,
  kind,
  files,
  access,
  onEdit,
  onDone,
}: {
  heading: string;
  empty: string;
  plan: Plan;
  rows: (Correction | Activity)[];
  kind: "corrección" | "actividad";
  files: PlanFile[];
  access: PlanDetail["access"];
  onEdit: () => void;
  onDone: (row: Correction | Activity) => void;
}) {
  const id = useId();
  const canMark = access.can_manage || access.is_responsible;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <SectionHeading id={id} title={heading} action={access.can_manage && <EditButton label="Editar" onClick={onEdit} />} />
      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => {
            const overdue = "overdue" in row && row.overdue;
            const rowFiles = files.filter((file) => file.activity_id === row.id || file.correction_id === row.id);
            return (
              <li key={row.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm break-words whitespace-pre-wrap">
                    <span className="tabular mr-1.5 text-text-secondary">{index + 1}.</span>
                    {row.description}
                  </p>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {row.done ? (
                      <Badge tone="success">
                        <Check aria-hidden="true" />
                        Realizada{row.done_at && <span className="tabular font-normal">· {dayOf(row.done_at)}</span>}
                      </Badge>
                    ) : overdue ? (
                      <OverdueBadge count={1} />
                    ) : (
                      <Badge>Pendiente</Badge>
                    )}
                  </span>
                </div>
                <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-3">
                  <Fact label="Responsables" value={responsibles(row)} />
                  <Fact label="Fecha límite" value={row.due_on ? dateOf(row.due_on) : null} />
                  <Fact label="Evidencias" value={row.evidence_note} />
                </dl>
                <RowFiles planId={plan.id} files={rowFiles} canRemove={canMark} />
                {canMark && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant={row.done ? "ghost" : "outline"} size="sm" className="max-md:h-11" onClick={() => onDone(row)}>
                      {row.done ? "Quitar la marca" : `Marcar ${kind === "actividad" ? "realizada" : "realizada"}`}
                    </Button>
                    <UploadButton planId={plan.id} rowId={row.id} label="Subir evidencias" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The free text of the old Excel, then the platform people by name (or counted, on an API that sends no names). */
function responsibles(row: Correction | Activity): string | null {
  const count = row.responsible_user_ids.length;
  const named = row.responsible_users?.map((person) => person.display_name ?? "Usuario que ya no existe") ?? [];
  const people =
    named.length > 0
      ? named.join(", ")
      : count > 0
        ? `${count} ${count === 1 ? "persona" : "personas"} de la plataforma`
        : null;
  const parts = [row.responsible_text, people].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="tabular break-words">{value || <span className="text-text-secondary">Sin dato</span>}</dd>
    </div>
  );
}

function Analysis({ plan, canManage, onEdit }: { plan: Plan; canManage: boolean; onEdit: () => void }) {
  const id = useId();
  const labels = usePlanLabels();
  const by5m = plan.analysis_method === "5m";
  const groups = by5m
    ? [...new Set(plan.causes.map((cause) => cause.category))].map((category) => ({
        category,
        causes: plan.causes.filter((cause) => cause.category === category),
      }))
    : [{ category: null as string | null, causes: plan.causes }];
  return (
    <section aria-labelledby={id} className="space-y-3">
      <SectionHeading id={id} title="Análisis" action={canManage && <EditButton label="Editar causas" onClick={onEdit} />} />
      <p className="text-sm">
        <span className="text-text-secondary">Método </span>
        {plan.analysis_method ? labels.methods(plan.analysis_method) : <span className="text-text-secondary">Sin elegir</span>}
      </p>
      {plan.causes.length === 0 ? (
        <p className="text-sm text-text-secondary">Todavía no hay causas.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.category ?? "all"} className="space-y-1.5">
              {group.category && <h3 className="text-[13px] font-medium">{labels.cause_categories(group.category)}</h3>}
              <ul className="space-y-1.5">
                {group.causes.map((cause) => (
                  <li key={cause.id} className="rounded-md bg-canvas-subtle px-3 py-2 text-sm break-words whitespace-pre-wrap">
                    {!by5m && <span className="mr-1.5 text-[13px] text-text-secondary">{labels.cause_categories(cause.category)}:</span>}
                    {cause.description}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FollowUp({ plan, canManage, onRate }: { plan: Plan; canManage: boolean; onRate: (activity: Activity) => void }) {
  const id = useId();
  const labels = usePlanLabels();
  return (
    <section aria-labelledby={id} className="space-y-3">
      <SectionHeading id={id} title="Seguimiento y eficacia" />
      {plan.activities_detail.length === 0 ? (
        <p className="text-sm text-text-secondary">El seguimiento empieza cuando haya actividades.</p>
      ) : (
        <ul className="space-y-3">
          {plan.activities_detail.map((activity, index) => (
            <li key={activity.id} className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm break-words">
                <span className="tabular mr-1.5 text-text-secondary">{index + 1}.</span>
                {activity.description}
              </p>
              <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-3">
                <Fact label="Seguimiento" value={activity.follow_up_text} />
                <Fact label="Fecha del seguimiento" value={activity.follow_up_due_on ? dateOf(activity.follow_up_due_on) : null} />
                <Fact label="Realizada" value={activity.done ? `Sí, ${dayOf(activity.done_at)}` : "No"} />
              </dl>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <PlanEffectivenessBadge effectiveness={activity.effective} />
                {activity.effectiveness_note && <span className="min-w-0 break-words text-text-secondary">{activity.effectiveness_note}</span>}
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-md:h-11"
                    disabled={!activity.done}
                    title={activity.done ? undefined : "Solo se califica una actividad ya realizada."}
                    onClick={() => onRate(activity)}
                  >
                    <Star aria-hidden="true" />
                    Calificar eficacia
                  </Button>
                )}
              </div>
              <span className="sr-only">Eficacia: {labels.effectiveness(activity.effective)}</span>
            </li>
          ))}
        </ul>
      )}
      {plan.effectiveness_note && (
        <p className="max-w-prose text-sm whitespace-pre-wrap">
          <span className="text-text-secondary">Descripción de la eficacia: </span>
          {plan.effectiveness_note}
        </p>
      )}
    </section>
  );
}

// ── Evidence ──

function UploadButton({ planId, rowId, label }: { planId: string; rowId?: string; label: string }) {
  const upload = useUploadEvidence(planId);
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={fileInput}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []).slice(0, 10);
          event.target.value = "";
          if (files.length === 0) return;
          upload.mutate(
            { files, rowId },
            {
              onSuccess: (result) => {
                if (result.files.length > 0) toast.success(result.files.length === 1 ? "Evidencia subida." : "Evidencias subidas.");
                if (result.rejected.length > 0) {
                  toast.warning(`No se subió: ${result.rejected.map((item) => `${item.filename ?? item.name ?? "archivo"} (${item.reason ?? "rechazado"})`).join("; ")}`, { duration: Infinity });
                }
              },
              onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
            }
          );
        }}
      />
      <Button variant="ghost" size="sm" className="max-md:h-11" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
        {upload.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />}
        {label}
      </Button>
    </>
  );
}

function RowFiles({ planId, files, canRemove }: { planId: string; files: PlanFile[]; canRemove: boolean }) {
  const remove = useDeleteEvidence(planId);
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {files.map((file) => (
        <li key={file.id} className="flex max-w-full items-center gap-1 rounded-md border border-border py-0.5 pr-0.5 pl-2 text-[13px]">
          <button
            type="button"
            className="flex min-w-0 items-center gap-1.5 rounded-sm hover:underline max-md:min-h-11"
            aria-label={`Descargar ${file.filename}`}
            onClick={() => downloadEvidence(planId, file.id, file.filename).catch((error) => toast.error(errorMessage(error), { duration: Infinity }))}
          >
            <Download className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
            <span className="truncate">{file.filename}</span>
            <span className="tabular shrink-0 text-text-secondary">{formatBytes(file.size_bytes)}</span>
          </button>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 max-md:size-11"
              aria-label={`Quitar ${file.filename}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(file.id, { onError: (error) => toast.error(errorMessage(error), { duration: Infinity }) })}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Evidence({ plan, files, canUpload, canRemove }: { plan: Plan; files: PlanFile[]; canUpload: boolean; canRemove: boolean }) {
  const id = useId();
  const general = files.filter((file) => !file.activity_id && !file.correction_id);
  return (
    <section aria-labelledby={id} className="space-y-3">
      <SectionHeading id={id} title="Evidencias de la acción" action={canUpload && <UploadButton planId={plan.id} label="Subir evidencias" />} />
      {general.length === 0 ? (
        <p className="text-sm text-text-secondary">Sin archivos generales. Los de cada fila salen en su fila.</p>
      ) : (
        <RowFiles planId={plan.id} files={general} canRemove={canRemove} />
      )}
    </section>
  );
}

// ── History ──

const EVENT_TEXT: Record<string, string> = {
  created: "Se creó la acción",
  updated: "Se editó el registro",
  rows_updated: "Se editaron las filas",
  row_done: "Se marcó una fila como realizada",
  row_reopened: "Se quitó la marca de realizada",
  rated: "Se calificó la eficacia de una actividad",
  attempt_opened: "Se abrió un nuevo intento",
  files_added: "Se subieron evidencias",
  file_removed: "Se quitó una evidencia",
};

const SECTION_TEXT: Record<string, string> = { corrections: "las correcciones", causes: "las causas", activities: "las actividades" };

function eventText(event: PlanEvent): string {
  const base = EVENT_TEXT[event.event_type] ?? "Cambio en la acción";
  const section = typeof event.data.section === "string" ? SECTION_TEXT[event.data.section] : null;
  if (event.event_type === "rows_updated" && section) return `Se editaron ${section}`;
  if (event.event_type === "created" && typeof event.data.case_code === "string") return `${base} desde el caso ${event.data.case_code}`;
  if (event.event_type === "attempt_opened" && typeof event.data.previous === "string") return `${base} a partir de ${event.data.previous}`;
  if (event.event_type === "files_added" && Array.isArray(event.data.files)) return `${base}: ${event.data.files.join(", ")}`;
  return base;
}

function History({ events }: { events: PlanEvent[] }) {
  const id = useId();
  const sorted = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <section aria-labelledby={id} className="space-y-3">
      <SectionHeading id={id} title="Historial" />
      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary">Sin movimientos.</p>
      ) : (
        <ol className="ml-3 border-l border-border">
          {sorted.map((event) => (
            <li key={event.id} className="relative pb-3 pl-5 text-sm last:pb-0">
              <span aria-hidden="true" className="absolute top-1.5 -left-[3px] size-1.5 rounded-full bg-border-control" />
              <p className="break-words">{eventText(event)}</p>
              {event.note && <p className="text-[13px] break-words text-text-secondary">{event.note}</p>}
              <time dateTime={event.created_at} className="tabular text-[13px] text-text-secondary">
                {dateTimeOf(event.created_at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ── Destructive and attempt confirmations ──

function DeletePlan({ plan, backHref, onClose }: { plan: Plan; backHref: string; onClose: () => void }) {
  const router = useRouter();
  const remove = useDeletePlan(plan.id);
  return (
    <ConfirmDeleteDialog
      open
      onOpenChange={(open) => !open && !remove.isPending && onClose()}
      title={`¿Eliminar ${plan.code}?`}
      confirmLabel="Eliminar acción"
      isPending={remove.isPending}
      error={remove.error ? errorMessage(remove.error) : null}
      onConfirm={() =>
        remove.mutate(undefined, {
          onSuccess: () => {
            toast.success(`${plan.code} eliminada.`);
            router.replace(backHref as never);
          },
        })
      }
    >
      Se elimina la acción con sus correcciones, causas, actividades y evidencias. No se puede deshacer.
    </ConfirmDeleteDialog>
  );
}

function NextAttemptDialog({ plan, backHref, onClose }: { plan: Plan; backHref: string; onClose: () => void }) {
  const router = useRouter();
  const attempt = useNextAttempt(plan.id);
  return (
    <ConfirmDeleteDialog
      open
      onOpenChange={(open) => !open && !attempt.isPending && onClose()}
      title={`Abrir el intento ${plan.attempt + 1}`}
      confirmLabel="Abrir nuevo intento"
      isPending={attempt.isPending}
      error={attempt.error ? errorMessage(attempt.error) : null}
      onConfirm={() =>
        attempt.mutate(undefined, {
          onSuccess: (detail) => {
            toast.success(`Intento ${detail.plan.attempt} abierto.`);
            onClose();
            router.push(`${backHref}/${detail.plan.id}` as never);
          },
        })
      }
    >
      Como la acción no fue eficaz, se crea otra con el mismo número y el intento siguiente, enlazada a esta y con antecedentes.
    </ConfirmDeleteDialog>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Cargando la acción</span>
      <div className="h-4 w-32 animate-pulse rounded-sm bg-canvas-subtle" />
      <div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-canvas-subtle" />
      <div className="h-40 animate-pulse rounded-lg bg-canvas-subtle" />
      <div className="h-40 animate-pulse rounded-lg bg-canvas-subtle" />
    </div>
  );
}
