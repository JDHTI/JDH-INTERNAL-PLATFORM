"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CheckCircle2, TriangleAlert, X } from "lucide-react";

import {
  ApiError,
  errorMessage,
  type ApiValidationIssue,
} from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/field";
import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";

import {
  COLOMBIA_DEPARTMENTS,
  getColombiaCities,
} from "../data/colombia-territorial";
import { validateFiles } from "../lib/attachments";
import {
  getPqrsfCatalog,
  submitPqrsfRequest,
} from "../services/pqrsf-public.service";
import type {
  PqrsfCatalog,
  PqrsfErrorField,
  PqrsfFormValues,
  PqrsfReceipt,
  PqrsfRequestType,
  PqrsfTextField,
} from "../types/pqrsf-public.types";
import AttachmentsField from "./attachments-field";
import DocumentRequestFields, { DOCUMENT_OTHER_LIMIT } from "./document-request-fields";
import { FormField, describedBy } from "./form-field";

const INITIAL_VALUES: PqrsfFormValues = {
  request_type_id: "",
  site_id: "",
  full_name: "",
  business_name: "",
  nit: "",
  address: "",
  department: "",
  city: "",
  email: "",
  subject: "",
  description: "",
  document_request: false,
  document_category_id: "",
  document_type_ids: [],
  document_other: "",
};

const FIELD_LABELS: Record<PqrsfErrorField, string> = {
  request_type_id: "Tipo de solicitud",
  site_id: "Sede",
  full_name: "Nombre completo",
  business_name: "Razón social",
  nit: "NIT",
  address: "Dirección",
  department: "Departamento",
  city: "Ciudad",
  email: "Correo electrónico",
  subject: "Asunto",
  description: "Descripción",
  document_category_id: "Categoría del documento",
  documents: "Documentos",
  document_other: "Otro documento",
  images: "Archivos adjuntos",
};

const FIELD_LIMITS: Partial<Record<PqrsfTextField, number>> = {
  full_name: 160,
  business_name: 160,
  nit: 32,
  address: 240,
  department: 80,
  city: 80,
  email: 254,
  subject: 200,
  description: 4000,
  document_other: DOCUMENT_OTHER_LIMIT,
};

const ERROR_FIELDS: PqrsfErrorField[] = [
  "request_type_id",
  "site_id",
  "full_name",
  "business_name",
  "nit",
  "address",
  "department",
  "city",
  "email",
  "subject",
  "document_category_id",
  "documents",
  "document_other",
  "description",
  "images",
];

type CatalogState = "loading" | "error" | "ready";
type FieldErrors = Partial<Record<PqrsfErrorField, string>>;

export default function PublicPqrsfForm() {
  const [catalog, setCatalog] = useState<PqrsfCatalog | null>(null);
  const [catalogState, setCatalogState] = useState<CatalogState>("loading");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [values, setValues] = useState<PqrsfFormValues>(() => ({ ...INITIAL_VALUES }));
  const [files, setFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<PqrsfReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusErrorSummary, setFocusErrorSummary] = useState(0);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const fetchCatalog = useCallback(async () => {
    const nextCatalog = await getPqrsfCatalog();
    return nextCatalog.request_types.length > 0 && nextCatalog.sites.length > 0
      ? nextCatalog
      : null;
  }, []);

  const applyCatalog = useCallback((nextCatalog: PqrsfCatalog | null) => {
    if (!nextCatalog) {
      setCatalog(null);
      setCatalogState("error");
      setCatalogError("El catálogo no tiene tipos de solicitud o sedes disponibles.");
      return;
    }

    setCatalog(nextCatalog);
    setCatalogState("ready");
  }, []);

  const applyCatalogError = useCallback((error: unknown) => {
    setCatalog(null);
    setCatalogState("error");
    setCatalogError(errorMessage(error));
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogState("loading");
    setCatalogError(null);

    try {
      applyCatalog(await fetchCatalog());
    } catch (error) {
      applyCatalogError(error);
    }
  }, [applyCatalog, applyCatalogError, fetchCatalog]);

  useEffect(() => {
    let active = true;
    fetchCatalog().then(
      (nextCatalog) => {
        if (active) applyCatalog(nextCatalog);
      },
      (error: unknown) => {
        if (active) applyCatalogError(error);
      }
    );

    return () => {
      active = false;
    };
  }, [applyCatalog, applyCatalogError, fetchCatalog]);

  const selectedType = useMemo(
    () => catalog?.request_types.find((type) => type.id === values.request_type_id),
    [catalog, values.request_type_id]
  );
  const cityOptions = useMemo(
    () => getColombiaCities(values.department),
    [values.department]
  );
  // A document request is a petition the customer flagged: it has no evidence
  // to attach, the documents asked for take their place.
  const isDocumentRequest = Boolean(
    selectedType?.allows_document_request && values.document_request
  );

  useEffect(() => {
    if (submission) successHeadingRef.current?.focus();
  }, [submission]);

  useEffect(() => {
    if (focusErrorSummary > 0) errorSummaryRef.current?.focus();
  }, [focusErrorSummary]);

  const clearFieldErrors = (...fields: PqrsfErrorField[]) => {
    setFieldErrors((current) => {
      if (!fields.some((field) => field in current)) return current;
      const next = { ...current };
      for (const field of fields) delete next[field];
      return next;
    });
  };

  // Fields are checked when the form is sent, never on leaving them: a message
  // under a field the person has not reached yet only gets in the way. An error
  // stays until that field is edited.
  const updateValue = (field: PqrsfTextField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    clearFieldErrors(field);
    setSubmitError(null);
  };

  const updateDepartment = (department: string) => {
    setValues((current) => ({ ...current, department, city: "" }));
    clearFieldErrors("department", "city");
    setSubmitError(null);
  };

  const updateRequestType = (requestTypeId: string) => {
    setValues((current) => ({
      ...current,
      request_type_id: requestTypeId,
      document_request: false,
      document_category_id: "",
      document_type_ids: [],
      document_other: "",
    }));
    setFiles([]);
    clearFieldErrors(
      "request_type_id",
      "document_category_id",
      "documents",
      "document_other",
      "images"
    );
    setSubmitError(null);
  };

  const updateDocumentRequest = (checked: boolean) => {
    setValues((current) => ({
      ...current,
      document_request: checked,
      document_category_id: "",
      document_type_ids: [],
      document_other: "",
    }));
    // Evidence and documents exclude each other.
    if (checked) setFiles([]);
    clearFieldErrors("document_category_id", "documents", "document_other", "images");
    setSubmitError(null);
  };

  const updateDocumentCategory = (categoryId: string) => {
    setValues((current) => ({
      ...current,
      document_category_id: categoryId,
      document_type_ids: [],
    }));
    clearFieldErrors("document_category_id", "documents");
    setSubmitError(null);
  };

  const toggleDocument = (documentId: string, checked: boolean) => {
    setValues((current) => ({
      ...current,
      document_type_ids: checked
        ? [...current.document_type_ids, documentId]
        : current.document_type_ids.filter((id) => id !== documentId),
    }));
    clearFieldErrors("documents");
    setSubmitError(null);
  };

  const updateFiles = (nextFiles: File[]) => {
    setFiles(nextFiles);
    setSubmitError(null);
  };

  const setFilesError = (message: string | null) => {
    if (message) setFieldErrors((current) => ({ ...current, images: message }));
    else clearFieldErrors("images");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validateForm(values, selectedType, files);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFocusErrorSummary((current) => current + 1);
      return;
    }

    if (!selectedType) {
      setFieldErrors({ request_type_id: "Selecciona un tipo de solicitud." });
      setFocusErrorSummary((current) => current + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await submitPqrsfRequest(
        {
          ...values,
          full_name: values.full_name.trim(),
          business_name: values.business_name.trim(),
          nit: values.nit.trim(),
          address: values.address.trim(),
          department: values.department.trim(),
          city: values.city.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          description: values.description.trim(),
          document_request: isDocumentRequest,
          document_category_id: isDocumentRequest ? values.document_category_id : "",
          document_type_ids: isDocumentRequest ? values.document_type_ids : [],
          document_other: isDocumentRequest ? values.document_other.trim() : "",
          images: selectedType.allows_attachments && !isDocumentRequest ? files : [],
        },
        crypto.randomUUID()
      );

      setSubmission(receipt);
      setValues({ ...INITIAL_VALUES });
      setFiles([]);
      setFieldErrors({});
    } catch (error) {
      const serverFieldErrors = error instanceof ApiError
        ? readFieldErrors(error.issues)
        : {};
      setFieldErrors(serverFieldErrors);
      setSubmitError(submissionErrorMessage(error));
      setFocusErrorSummary((current) => current + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startNewRequest = () => {
    setSubmission(null);
    setValues({ ...INITIAL_VALUES });
    setFiles([]);
    setFieldErrors({});
    setSubmitError(null);
  };

  return (
    <main className="min-h-dvh bg-canvas text-text-primary">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
        <header className="space-y-2">
          <p className="text-[13px] font-medium text-text-secondary">JDH Presenta tu PQRSF</p>
          <h1 className="text-2xl font-semibold tracking-tight">¡Queremos escucharte!</h1>
          <p className="max-w-prose text-sm text-text-secondary">
            En nuestra empresa valoramos sus comentarios y sugerencias. Este formulario nos permite mejorar continuamente nuestros productos y servicios. Por favor, diligencie la siguiente información para brindarte una respuesta adecuada.
          </p>
        </header>

        {catalogState === "loading" && <CatalogLoading />}

        {catalogState === "error" && (
          <CatalogError message={catalogError ?? "No se pudo cargar el catálogo."} onRetry={loadCatalog} />
        )}

        {catalogState === "ready" && catalog && (
          submission ? (
            <SuccessState receipt={submission} onNewRequest={startNewRequest} headingRef={successHeadingRef} />
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit}
              aria-busy={isSubmitting}
              className="rounded-lg border border-border bg-surface p-4 md:p-6"
            >
              <div className="space-y-6">
                {(Object.keys(fieldErrors).length > 0 || submitError) && (
                  <ErrorSummary
                    errors={fieldErrors}
                    submitError={submitError}
                    summaryRef={errorSummaryRef}
                  />
                )}

                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <FormField
                    id="pqrsf-request-type"
                    label="Tipo de solicitud"
                    error={fieldErrors.request_type_id}
                  >
                    <div className="relative">
                      <Dropdown
                        id="pqrsf-request-type"
                        name="request_type_id"
                        options={catalog.request_types.map((type) => ({
                          value: type.id,
                          label: type.name,
                        }))}
                        value={values.request_type_id}
                        onValueChange={updateRequestType}
                        aria-invalid={Boolean(fieldErrors.request_type_id)}
                        aria-required="true"
                        aria-label="Tipo de solicitud"
                        aria-describedby={describedBy("pqrsf-request-type", Boolean(fieldErrors.request_type_id))}
                        placeholder="Selecciona una opción"
                      />
                      {values.request_type_id && (
                        <button
                          type="button"
                          aria-label="Quitar tipo de solicitud"
                          onClick={() => updateRequestType("")}
                          className="absolute right-8 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring-control"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </FormField>

                  <FormField id="pqrsf-site" label="Sede" error={fieldErrors.site_id}>
                    <Dropdown
                      id="pqrsf-site"
                      name="site_id"
                      options={catalog.sites.map((site) => ({
                        value: site.id,
                        label: site.name,
                      }))}
                      value={values.site_id}
                      onValueChange={(value) => updateValue("site_id", value)}
                      aria-invalid={Boolean(fieldErrors.site_id)}
                      aria-required="true"
                      aria-label="Sede"
                      aria-describedby={describedBy("pqrsf-site", Boolean(fieldErrors.site_id))}
                      placeholder="Selecciona una sede"
                    />
                  </FormField>

                  <FormField id="pqrsf-full-name" label="Nombre completo" error={fieldErrors.full_name}>
                    <InputField
                      id="pqrsf-full-name"
                      name="full_name"
                      value={values.full_name}
                      autoComplete="name"
                      maxLength={FIELD_LIMITS.full_name}
                      error={fieldErrors.full_name}
                      onChange={(event) => updateValue("full_name", event.target.value)}
                    />
                  </FormField>

                  <FormField id="pqrsf-email" label="Correo electrónico" error={fieldErrors.email}>
                    <InputField
                      id="pqrsf-email"
                      name="email"
                      type="email"
                      value={values.email}
                      autoComplete="email"
                      maxLength={FIELD_LIMITS.email}
                      error={fieldErrors.email}
                      onChange={(event) => updateValue("email", event.target.value)}
                    />
                  </FormField>

                  <FormField id="pqrsf-business-name" label="Razón social" error={fieldErrors.business_name}>
                    <InputField
                      id="pqrsf-business-name"
                      name="business_name"
                      value={values.business_name}
                      autoComplete="organization"
                      maxLength={FIELD_LIMITS.business_name}
                      error={fieldErrors.business_name}
                      onChange={(event) => updateValue("business_name", event.target.value)}
                    />
                  </FormField>

                  <FormField id="pqrsf-nit" label="NIT" error={fieldErrors.nit}>
                    <InputField
                      id="pqrsf-nit"
                      name="nit"
                      value={values.nit}
                      inputMode="numeric"
                      maxLength={FIELD_LIMITS.nit}
                      error={fieldErrors.nit}
                      onChange={(event) => updateValue("nit", event.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="pqrsf-address"
                    label="Dirección"
                    error={fieldErrors.address}
                    className="sm:col-span-2"
                  >
                    <InputField
                      id="pqrsf-address"
                      name="address"
                      value={values.address}
                      autoComplete="street-address"
                      maxLength={FIELD_LIMITS.address}
                      error={fieldErrors.address}
                      onChange={(event) => updateValue("address", event.target.value)}
                    />
                  </FormField>

                  <FormField id="pqrsf-department" label="Departamento" error={fieldErrors.department}>
                    <SearchableDropdown
                      id="pqrsf-department"
                      name="department"
                      value={values.department}
                      options={COLOMBIA_DEPARTMENTS}
                      onValueChange={updateDepartment}
                      placeholder="Escribe para buscar un departamento"
                      invalid={Boolean(fieldErrors.department)}
                      required
                      describedBy={describedBy("pqrsf-department", Boolean(fieldErrors.department))}
                    />
                  </FormField>

                  <FormField id="pqrsf-city" label="Ciudad" error={fieldErrors.city}>
                    <SearchableDropdown
                      id="pqrsf-city"
                      name="city"
                      value={values.city}
                      options={cityOptions}
                      onValueChange={(value) => updateValue("city", value)}
                      placeholder={values.department ? "Escribe para buscar una ciudad" : "Selecciona primero un departamento"}
                      emptyMessage={values.department ? "No hay ciudades con ese nombre." : "Selecciona primero un departamento."}
                      disabled={!values.department}
                      invalid={Boolean(fieldErrors.city)}
                      required
                      describedBy={describedBy("pqrsf-city", Boolean(fieldErrors.city))}
                    />
                  </FormField>

                  <FormField
                    id="pqrsf-subject"
                    label="Asunto"
                    error={fieldErrors.subject}
                    hint="Resume en pocas palabras qué necesitas."
                    className="sm:col-span-2"
                  >
                    <Input
                      id="pqrsf-subject"
                      name="subject"
                      required
                      value={values.subject}
                      maxLength={FIELD_LIMITS.subject}
                      aria-invalid={Boolean(fieldErrors.subject)}
                      aria-describedby={describedBy("pqrsf-subject", true, Boolean(fieldErrors.subject))}
                      onChange={(event) => updateValue("subject", event.target.value)}
                      className={cn("min-h-11 sm:min-h-9", fieldErrors.subject && "border-danger")}
                    />
                  </FormField>

                  {selectedType?.allows_document_request && (
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="pqrsf-document-request"
                        className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border border-border p-3 text-sm"
                      >
                        <input
                          id="pqrsf-document-request"
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                          checked={values.document_request}
                          onChange={(event) => updateDocumentRequest(event.target.checked)}
                        />
                        <span className="min-w-0">
                          <span className="font-medium">Solicito un documento o certificado</span>
                          <span className="text-text-secondary"> (opcional)</span>
                          <span className="mt-0.5 block text-[13px] text-text-secondary">
                            Márcalo si lo que necesitas es recibir un certificado, una ficha técnica u otro documento de JDH.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}

                  {isDocumentRequest && catalog.document_categories.length > 0 && (
                    <DocumentRequestFields
                      categories={catalog.document_categories}
                      categoryId={values.document_category_id}
                      documentIds={values.document_type_ids}
                      other={values.document_other}
                      categoryError={fieldErrors.document_category_id}
                      documentsError={fieldErrors.documents}
                      otherError={fieldErrors.document_other}
                      onCategoryChange={updateDocumentCategory}
                      onToggleDocument={toggleDocument}
                      onOtherChange={(value) => updateValue("document_other", value)}
                    />
                  )}

                  <FormField
                    id="pqrsf-description"
                    label="Descripción"
                    error={fieldErrors.description}
                    className="sm:col-span-2"
                  >
                    <Textarea
                      id="pqrsf-description"
                      name="description"
                      required
                      value={values.description}
                      maxLength={FIELD_LIMITS.description}
                      aria-invalid={Boolean(fieldErrors.description)}
                      aria-describedby={describedBy("pqrsf-description", false, Boolean(fieldErrors.description))}
                      onChange={(event) => updateValue("description", event.target.value)}
                      className={cn(
                        "min-h-32 resize-y sm:min-h-28",
                        fieldErrors.description && "border-danger"
                      )}
                    />
                  </FormField>

                  {selectedType?.allows_attachments && !isDocumentRequest && (
                    <AttachmentsField
                      files={files}
                      error={fieldErrors.images}
                      onFilesChange={updateFiles}
                      onError={setFilesError}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2 border-t border-border pt-5 sm:items-end">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="min-h-11 w-full sm:min-h-10 sm:w-auto"
                  >
                    {isSubmitting ? "Enviando solicitud…" : "Enviar solicitud"}
                  </Button>
                  <p className="text-[13px] text-text-secondary" aria-live="polite">
                    Tus datos se usan para gestionar y responder esta solicitud.
                  </p>
                </div>
              </div>
            </form>
          )
        )}

        <p className="text-[13px] text-text-secondary">
          Si necesitas ayuda para completar el formulario, comunícate con tu sede.
        </p>
      </div>
    </main>
  );
}

function InputField({
  id,
  name,
  value,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  error,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  type?: React.ComponentProps<"input">["type"];
  autoComplete?: string;
  inputMode?: React.ComponentProps<"input">["inputMode"];
  maxLength?: number;
  error?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <Input
      id={id}
      name={name}
      type={type}
      value={value}
      required
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy(id, false, Boolean(error))}
      onChange={onChange}
      className={cn("min-h-11 sm:min-h-9", error && "border-danger")}
    />
  );
}

function ErrorSummary({
  errors,
  submitError,
  summaryRef,
}: {
  errors: FieldErrors;
  submitError: string | null;
  summaryRef: React.RefObject<HTMLDivElement | null>;
}) {
  const entries = ERROR_FIELDS.filter((field) => errors[field]).map((field) => ({
    field,
    message: errors[field] as string,
  }));

  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby="pqrsf-form-feedback-title"
      className="flex flex-col gap-2 rounded-md border border-danger bg-danger-surface p-3 text-sm text-danger outline-none"
    >
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <h2 id="pqrsf-form-feedback-title" className="font-semibold">
            Revisa la información antes de enviar
          </h2>
          {submitError && <p>{submitError}</p>}
        </div>
      </div>
      {entries.length > 0 && (
        <ul className="list-disc space-y-1 pl-6">
          {entries.map(({ field, message }) => (
            <li key={field}>
              <a className="underline underline-offset-2" href={`#${fieldInputId(field)}`}>
                {FIELD_LABELS[field]}: {message}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CatalogLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando formulario"
      className="rounded-lg border border-border bg-surface p-4 md:p-6"
    >
      <div className="space-y-4">
        <div className="h-9 animate-pulse rounded-md bg-canvas-subtle" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-16 animate-pulse rounded-md bg-canvas-subtle" />
          <div className="h-16 animate-pulse rounded-md bg-canvas-subtle" />
        </div>
        <p className="text-sm text-text-secondary" role="status">
          Cargando opciones disponibles…
        </p>
      </div>
    </section>
  );
}

function CatalogError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section role="alert" className="rounded-lg border border-danger bg-danger-surface p-4 md:p-6">
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="font-semibold">No se pudo cargar el formulario</h2>
            <p className="text-sm">{message}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </section>
  );
}

function SuccessState({
  receipt,
  onNewRequest,
  headingRef,
}: {
  receipt: PqrsfReceipt;
  onNewRequest: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section
      aria-labelledby="pqrsf-success-title"
      className="rounded-lg border border-success bg-success-surface p-4 md:p-6"
    >
      <div className="flex flex-col items-start gap-4">
        <CheckCircle2 className="size-7 text-success" aria-hidden="true" />
        <div className="space-y-2">
          <h2 ref={headingRef} tabIndex={-1} id="pqrsf-success-title" className="text-xl font-semibold outline-none">
            Tu solicitud fue radicada
          </h2>
          <p className="max-w-prose text-sm text-text-secondary">
            Conserva este número para consultar la gestión de tu solicitud:
          </p>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="font-medium">Número de radicado</dt>
          <dd className="font-mono font-medium tabular">{receipt.reference}</dd>
          <dt className="font-medium">Fecha de recepción</dt>
          <dd className="text-text-secondary">{formatCreatedAt(receipt.created_at)}</dd>
        </dl>
        <Button type="button" variant="outline" onClick={onNewRequest} className="min-h-11 sm:min-h-10">
          Presentar otra solicitud
        </Button>
      </div>
    </section>
  );
}

const REQUIRED_TEXT_FIELDS: PqrsfTextField[] = [
  "request_type_id",
  "site_id",
  "full_name",
  "business_name",
  "nit",
  "address",
  "department",
  "city",
  "email",
  "subject",
  "description",
];

function validateForm(
  values: PqrsfFormValues,
  selectedType: PqrsfRequestType | undefined,
  files: File[]
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of REQUIRED_TEXT_FIELDS) {
    const message = validateField(field, values, selectedType);
    if (message) errors[field] = message;
  }

  if (selectedType?.allows_document_request && values.document_request) {
    if (!values.document_category_id) {
      errors.document_category_id = "Selecciona la categoría del documento.";
    } else if (values.document_type_ids.length === 0 && !values.document_other.trim()) {
      errors.documents = "Marca al menos un documento o escríbelo en «Otro documento».";
    }
    const otherLimit = FIELD_LIMITS.document_other;
    if (otherLimit && values.document_other.trim().length > otherLimit) {
      errors.document_other = `${FIELD_LABELS.document_other} admite máximo ${otherLimit} caracteres.`;
    }
  } else if (selectedType?.allows_attachments && files.length > 0) {
    const message = validateFiles(files);
    if (message) errors.images = message;
  }
  return errors;
}

function validateField(
  field: PqrsfTextField,
  values: PqrsfFormValues,
  selectedType: PqrsfRequestType | undefined
): string | null {
  const value = values[field].trim();
  if (!value) return `Completa ${FIELD_LABELS[field].toLowerCase()}.`;

  if (field === "request_type_id" && !selectedType) {
    return "Selecciona un tipo de solicitud válido.";
  }

  if (field === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
    return "Escribe un correo electrónico válido.";
  }

  const maxLength = FIELD_LIMITS[field];
  if (maxLength && value.length > maxLength) {
    return `${FIELD_LABELS[field]} admite máximo ${maxLength} caracteres.`;
  }

  return null;
}

function readFieldErrors(issues: ApiValidationIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = [...(issue.loc ?? [])]
      .reverse()
      .find((part): part is PqrsfErrorField =>
        typeof part === "string" && ERROR_FIELDS.includes(part as PqrsfErrorField)
      );
    if (field && issue.msg) errors[field] = issue.msg;
  }
  return errors;
}

function submissionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return errorMessage(error);

  switch (error.status) {
    case 422:
      return "El servidor encontró datos que necesitan corrección. Revisa los campos marcados.";
    case 413:
      return "Los archivos superan los límites permitidos. Revisa cantidad y tamaño e inténtalo de nuevo.";
    case 409:
      return "El envío anterior tiene una respuesta distinta. Verifica si ya recibiste un radicado antes de intentar de nuevo.";
    case 429:
      return "Se alcanzó el límite temporal de envíos. Espera unos minutos e inténtalo de nuevo.";
    case 503:
      return "El servicio está temporalmente no disponible. Inténtalo de nuevo en unos minutos.";
    default:
      return errorMessage(error);
  }
}

function fieldInputId(field: PqrsfErrorField) {
  return `pqrsf-${field.replaceAll("_", "-")}`;
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
