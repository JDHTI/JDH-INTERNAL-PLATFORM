"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Camera, CheckCircle2, TriangleAlert, X } from "lucide-react";

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
  description: "",
  reason: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILE_COUNT = 5;
const ACCEPTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  description: "Descripción",
  reason: "Motivo",
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
  description: 4000,
  reason: 4000,
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
  "description",
  "reason",
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    if (submission) successHeadingRef.current?.focus();
  }, [submission]);

  useEffect(() => {
    if (focusErrorSummary > 0) errorSummaryRef.current?.focus();
  }, [focusErrorSummary]);

  const clearFieldError = (field: PqrsfErrorField) => {
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateValue = (field: PqrsfTextField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    clearFieldError(field);
    setSubmitError(null);
  };

  const updateDepartment = (department: string) => {
    setValues((current) => ({ ...current, department, city: "" }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.department;
      delete next.city;
      return next;
    });
    setSubmitError(null);
  };

  const resetFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const updateRequestType = (requestTypeId: string) => {
    setValues((current) => ({
      ...current,
      request_type_id: requestTypeId,
      reason: "",
    }));
    setFiles([]);
    resetFileInputs();
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.request_type_id;
      delete next.reason;
      delete next.images;
      return next;
    });
    setSubmitError(null);
  };

  const handleBlur = (field: PqrsfTextField) => {
    const message = validateField(field, values, selectedType);
    setFieldErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.currentTarget.files ?? []);
    const message = validateFiles(nextFiles);

    setSubmitError(null);
    if (message) {
      setFiles([]);
      event.currentTarget.value = "";
      setFieldErrors((current) => ({ ...current, images: message }));
      return;
    }

    setFiles(nextFiles);
    clearFieldError("images");
  };

  const handleCameraCapture = (event: ChangeEvent<HTMLInputElement>) => {
    const capturedFiles = Array.from(event.currentTarget.files ?? []);
    if (capturedFiles.length === 0) return;

    const nextFiles = [...files, ...capturedFiles];
    const message = validateFiles(nextFiles);

    setSubmitError(null);
    event.currentTarget.value = "";
    if (message) {
      setFieldErrors((current) => ({ ...current, images: message }));
      return;
    }

    setFiles(nextFiles);
    clearFieldError("images");
  };

  const removeFiles = () => {
    setFiles([]);
    resetFileInputs();
    clearFieldError("images");
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
          request_type_id: values.request_type_id,
          site_id: values.site_id,
          full_name: values.full_name.trim(),
          business_name: values.business_name.trim(),
          nit: values.nit.trim(),
          address: values.address.trim(),
          department: values.department.trim(),
          city: values.city.trim(),
          email: values.email.trim(),
          description: values.description.trim(),
          reason: selectedType.allows_reason ? values.reason.trim() : undefined,
          images: selectedType.allows_attachments ? files : [],
        },
        crypto.randomUUID()
      );

      setSubmission(receipt);
      setValues({ ...INITIAL_VALUES });
      setFiles([]);
      setFieldErrors({});
      resetFileInputs();
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
    resetFileInputs();
  };

  return (
    <main className="min-h-dvh bg-canvas text-text-primary">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
        <header className="space-y-2">
          <p className="text-[13px] font-medium text-text-secondary">JDH · Atención al ciudadano</p>
          <h1 className="text-2xl font-semibold tracking-tight">Presenta tu PQRSF</h1>
          <p className="max-w-prose text-sm text-text-secondary">
            Envía una petición, queja, reclamo, sugerencia o felicitación. Completa la información para recibir tu número de radicado.
          </p>
          <p className="text-[13px] text-text-secondary">
            <span className="text-danger" aria-hidden="true">*</span> Campos obligatorios
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
                        onBlur={() => handleBlur("request_type_id")}
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
                      onBlur={() => handleBlur("site_id")}
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
                      onBlur={() => handleBlur("full_name")}
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
                      onBlur={() => handleBlur("email")}
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
                      onBlur={() => handleBlur("business_name")}
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
                      onBlur={() => handleBlur("nit")}
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
                      onBlur={() => handleBlur("address")}
                    />
                  </FormField>

                  <FormField id="pqrsf-department" label="Departamento" error={fieldErrors.department}>
                    <SearchableDropdown
                      id="pqrsf-department"
                      name="department"
                      value={values.department}
                      options={COLOMBIA_DEPARTMENTS}
                      onValueChange={updateDepartment}
                      onBlur={() => handleBlur("department")}
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
                      onBlur={() => handleBlur("city")}
                      placeholder={values.department ? "Escribe para buscar una ciudad" : "Selecciona primero un departamento"}
                      emptyMessage={values.department ? "No hay ciudades con ese nombre." : "Selecciona primero un departamento."}
                      disabled={!values.department}
                      invalid={Boolean(fieldErrors.city)}
                      required
                      describedBy={describedBy("pqrsf-city", Boolean(fieldErrors.city))}
                    />
                  </FormField>

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
                      aria-describedby={describedBy("pqrsf-description", Boolean(fieldErrors.description))}
                      onChange={(event) => updateValue("description", event.target.value)}
                      onBlur={() => handleBlur("description")}
                      className={cn(
                        "min-h-32 resize-y sm:min-h-28",
                        fieldErrors.description && "border-danger"
                      )}
                    />
                  </FormField>

                  {selectedType?.allows_reason && (
                    <FormField
                      id="pqrsf-reason"
                      label="Motivo"
                      error={fieldErrors.reason}
                      hint="Explica qué ocurrió o qué respuesta necesitas."
                      className="sm:col-span-2"
                    >
                      <Textarea
                        id="pqrsf-reason"
                        name="reason"
                        required
                        value={values.reason}
                        maxLength={FIELD_LIMITS.reason}
                        aria-invalid={Boolean(fieldErrors.reason)}
                        aria-describedby={describedBy("pqrsf-reason", true, Boolean(fieldErrors.reason))}
                        onChange={(event) => updateValue("reason", event.target.value)}
                        onBlur={() => handleBlur("reason")}
                        className={cn(
                          "min-h-28 resize-y",
                          fieldErrors.reason && "border-danger"
                        )}
                      />
                    </FormField>
                  )}

                  {selectedType?.allows_attachments && (
                    <FormField
                      id="pqrsf-images"
                      label="Archivos adjuntos"
                      optional
                      error={fieldErrors.images}
                      hint="JPG, JPEG, PNG o WebP. Máximo 5 archivos de 5 MiB cada uno y 25 MiB en total."
                      className="sm:col-span-2"
                    >
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          ref={fileInputRef}
                          id="pqrsf-images"
                          name="images"
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={handleFilesChange}
                          aria-invalid={Boolean(fieldErrors.images)}
                          aria-describedby={describedBy("pqrsf-images", true, Boolean(fieldErrors.images))}
                          className={cn(
                            "min-h-11 w-full min-w-0 rounded-md border border-border-control bg-transparent px-2 py-1.5 text-sm text-text-primary file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text-on-primary sm:min-h-9",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            fieldErrors.images && "border-danger"
                          )}
                        />
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          capture="environment"
                          onChange={handleCameraCapture}
                          aria-label="Tomar una foto de evidencia"
                          tabIndex={-1}
                          className="sr-only"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => cameraInputRef.current?.click()}
                          className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                          aria-describedby={describedBy("pqrsf-images", true, Boolean(fieldErrors.images))}
                        >
                          <Camera aria-hidden="true" />
                          Tomar foto
                        </Button>
                      </div>
                      <p className="text-[13px] text-text-secondary">
                        En el celular, “Tomar foto” abrirá la cámara y solicitará permiso si es necesario.
                      </p>
                      {files.length > 0 && (
                        <div className="flex flex-col gap-2 rounded-md bg-canvas-subtle p-3">
                          <ul className="space-y-1 text-[13px]" aria-label="Archivos seleccionados">
                            {files.map((file) => (
                              <li key={`${file.name}-${file.lastModified}`} className="flex min-w-0 items-center justify-between gap-3">
                                <span className="min-w-0 truncate">{file.name}</span>
                                <span className="shrink-0 text-text-secondary">{formatFileSize(file.size)}</span>
                              </li>
                            ))}
                          </ul>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-11 self-start sm:min-h-8"
                            onClick={removeFiles}
                          >
                            Quitar archivos
                          </Button>
                        </div>
                      )}
                    </FormField>
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

function FormField({
  id,
  label,
  optional = false,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-medium leading-[1.4] tracking-normal">
        {label}
        {!optional && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
        {optional && <span className="font-normal text-text-secondary"> (opcional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
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
  onBlur,
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
  onBlur: React.FocusEventHandler<HTMLInputElement>;
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
      aria-describedby={describedBy(id, Boolean(error))}
      onChange={onChange}
      onBlur={onBlur}
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

function validateForm(
  values: PqrsfFormValues,
  selectedType: PqrsfRequestType | undefined,
  files: File[]
): FieldErrors {
  const fields: PqrsfErrorField[] = [
    "request_type_id",
    "site_id",
    "full_name",
    "business_name",
    "nit",
    "address",
    "department",
    "city",
    "email",
    "description",
  ];
  if (selectedType?.allows_reason) fields.push("reason");
  if (selectedType?.allows_attachments && files.length > 0) fields.push("images");

  const errors: FieldErrors = {};
  for (const field of fields) {
    const message = validateField(field, values, selectedType, files);
    if (message) errors[field] = message;
  }
  return errors;
}

function validateField(
  field: PqrsfErrorField,
  values: PqrsfFormValues,
  selectedType: PqrsfRequestType | undefined,
  files: File[] = []
): string | null {
  if (field === "images") return validateFiles(files);
  if (field === "reason" && !selectedType?.allows_reason) return null;

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

function validateFiles(files: File[]): string | null {
  if (files.length > MAX_FILE_COUNT) {
    return `Selecciona máximo ${MAX_FILE_COUNT} archivos.`;
  }

  let totalSize = 0;
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ACCEPTED_EXTENSIONS.has(extension)) {
      return `${file.name} no es una imagen permitida. Usa JPG, JPEG, PNG o WebP.`;
    }
    if (file.type && !ACCEPTED_MIME_TYPES.has(file.type.toLowerCase())) {
      return `${file.name} tiene un tipo MIME no permitido.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} supera el límite de 5 MiB.`;
    }
    totalSize += file.size;
  }

  if (totalSize > MAX_TOTAL_FILE_SIZE) {
    return "El tamaño total de los archivos no puede superar 25 MiB.";
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

function describedBy(id: string, hasHint: boolean, hasError = false) {
  const ids = [];
  if (hasHint) ids.push(`${id}-hint`);
  if (hasError) ids.push(`${id}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function fieldInputId(field: PqrsfErrorField) {
  return `pqrsf-${field.replaceAll("_", "-")}`;
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
