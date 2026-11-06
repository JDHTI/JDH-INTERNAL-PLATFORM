"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import { CheckCircle2, TriangleAlert } from "lucide-react";

import {
  ApiError,
  LOGIN_URL,
  errorMessage,
  type ApiValidationIssue,
} from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/field";
import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";

import {
  COLOMBIA_DEPARTMENTS,
  getColombiaCities,
} from "../data/colombia-territorial";
import { splitEvidence, validateFiles } from "../lib/attachments";
import {
  getPqrsfCatalog,
  submitPqrsfRequest,
} from "../services/pqrsf-public.service";
import type {
  AttachmentLimits,
  PickupOrderAnswer,
  PqrsfCatalog,
  PqrsfCause,
  PqrsfDependency,
  PqrsfErrorField,
  PqrsfFormValues,
  PqrsfProductLine,
  PqrsfReceipt,
  PqrsfRequestType,
  PqrsfSubject,
  PqrsfTextField,
} from "../types/pqrsf-public.types";
import AttachmentsField from "./attachments-field";
import ChoiceList from "./choice-list";
import DocumentRequestFields, { DOCUMENT_OTHER_LIMIT } from "./document-request-fields";
import { FormField, describedBy } from "./form-field";
import ProductLinesField, {
  PICKUP_ORDER_NUMBER_LIMIT,
  emptyProductLine,
  type ProductLineErrors,
  type ProductLineField,
} from "./product-lines-field";

// TODO: the default is a placeholder number until support has a real WhatsApp
// line; set NEXT_PUBLIC_PQRSF_SUPPORT_WHATSAPP_URL (it is inlined at build time).
const SUPPORT_WHATSAPP_URL =
  process.env.NEXT_PUBLIC_PQRSF_SUPPORT_WHATSAPP_URL ?? "https://wa.me/570000000000";

const INITIAL_VALUES: PqrsfFormValues = {
  request_type_id: "",
  site_id: "",
  area_id: "",
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
  subject_id: "",
  cause_id: "",
  pickup_order_requested: "",
  pickup_order_number: "",
  delivery_date: "",
};

/** What a new type, subject or document choice clears: it all hangs from them. */
const CLASSIFICATION_RESET = {
  subject_id: "",
  cause_id: "",
  pickup_order_requested: "",
  pickup_order_number: "",
  delivery_date: "",
} as const;

const FIELD_LABELS: Record<PqrsfErrorField, string> = {
  request_type_id: "Tipo de solicitud",
  site_id: "Sede",
  area_id: "Área",
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
  images: "Evidencias",
  subject_id: "Asunto",
  cause_id: "Causal",
  products: "Productos afectados",
  pickup_order_requested: "Orden de recogida",
  pickup_order_number: "Número de la orden de recogida",
  delivery_date: "Fecha de entrega del pedido",
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
  pickup_order_number: PICKUP_ORDER_NUMBER_LIMIT,
};

/** In the order the fields appear, which is the order the error summary lists them. */
const ERROR_FIELDS: PqrsfErrorField[] = [
  "request_type_id",
  "site_id",
  "area_id",
  "full_name",
  "email",
  "business_name",
  "nit",
  "address",
  "department",
  "city",
  "subject_id",
  "cause_id",
  "subject",
  "document_category_id",
  "documents",
  "document_other",
  "description",
  "products",
  "delivery_date",
  "pickup_order_requested",
  "pickup_order_number",
  "images",
];

type CatalogState = "loading" | "error" | "ready";
type FieldErrors = Partial<Record<PqrsfErrorField, string>>;

/**
 * What the chosen type, subject and cause ask of the rest of the form. The
 * catalog decides it, not this file: a type is classified when some subject
 * lists its code, and a cause says whether it takes products.
 */
interface Classification {
  type: PqrsfRequestType | undefined;
  isDocumentRequest: boolean;
  /** Every subject the type offers: whether the type asks for a subject at all. */
  subjects: PqrsfSubject[];
  /** Areas to pick after the site; empty when the type does not ask for one. */
  areas: PqrsfDependency[];
  /** The chosen area goes to the API (the type has `asks_area`). */
  sendsArea: boolean;
  requiresArea: boolean;
  /** The subjects on screen: those of the chosen area, plus «Otro», which fits any area. */
  visibleSubjects: PqrsfSubject[];
  subject: PqrsfSubject | undefined;
  cause: PqrsfCause | undefined;
  /** «Otro» in the subject or the cause: the description becomes required. */
  isOther: boolean;
  allowsProducts: boolean;
  requiresProducts: boolean;
}

function classify(catalog: PqrsfCatalog | null, values: PqrsfFormValues): Classification {
  const type = catalog?.request_types.find((item) => item.id === values.request_type_id);
  // A document request is a petition the customer flagged: it has no evidence
  // to attach, the documents asked for take their place, and no subject list.
  const isDocumentRequest = Boolean(type?.allows_document_request && values.document_request);
  const subjects =
    type && catalog && !isDocumentRequest
      ? catalog.subjects.filter((item) => item.request_type_codes.includes(type.code))
      : [];
  // The area is on screen from the start (locked with the rest until a type is
  // picked) and leaves only for a type that says it does not ask for one
  // (`asks_area: false`, compliments). It is sent where the type asks for it;
  // the cause still decides where a case with one goes, and on types with
  // subjects the area narrows the list.
  const sendsArea = type?.asks_area === true;
  const areas = type?.asks_area === false ? [] : catalog?.dependencies ?? [];
  const inArea = subjects.filter((item) => item.is_other || item.dependency_id === values.area_id);
  const visibleSubjects =
    areas.length === 0 || subjects.length === 0
      ? subjects
      : !values.area_id
        ? []
        : // An area with no subject of its own (not even «Otro») shows them all,
          // so a required subject is never left without options.
          inArea.length > 0
          ? inArea
          : subjects;
  const subject = visibleSubjects.find((item) => item.id === values.subject_id);
  const cause = subject?.causes.find((item) => item.id === values.cause_id);
  return {
    type,
    isDocumentRequest,
    subjects,
    areas,
    sendsArea,
    // Required where it does something: it is sent, or it narrows the subjects.
    requiresArea: areas.length > 0 && (sendsArea || subjects.length > 0),
    visibleSubjects,
    subject,
    cause,
    isOther: Boolean(subject?.is_other || cause?.is_other),
    allowsProducts: Boolean(cause?.allows_product),
    requiresProducts: Boolean(cause?.requires_product),
  };
}

/** The written subject is the whole subject where there is no list, and a complement with «Otro». */
function asksWrittenSubject(c: Classification) {
  return c.subjects.length === 0 || c.isOther;
}

/** Suggestions and compliments are their description; with a list it is optional unless «Otro». */
function requiresDescription(c: Classification) {
  if (c.subjects.length > 0) return c.isOther;
  return !c.isDocumentRequest;
}

export default function PublicPqrsfForm() {
  const [catalog, setCatalog] = useState<PqrsfCatalog | null>(null);
  const [catalogState, setCatalogState] = useState<CatalogState>("loading");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [values, setValues] = useState<PqrsfFormValues>(() => ({ ...INITIAL_VALUES }));
  const [files, setFiles] = useState<File[]>([]);
  const [productLines, setProductLines] = useState<PqrsfProductLine[]>([]);
  const [lineErrors, setLineErrors] = useState<Record<string, ProductLineErrors>>({});
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

  const classification = useMemo(() => classify(catalog, values), [catalog, values]);
  const { type: selectedType, isDocumentRequest } = classification;
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

  /** Products and the pickup answer belong to a cause: changing it drops them. */
  const resetProducts = (lines: PqrsfProductLine[] = []) => {
    setProductLines(lines);
    setLineErrors({});
    clearFieldErrors("products", "pickup_order_requested", "pickup_order_number", "delivery_date");
  };

  const updateRequestType = (requestTypeId: string) => {
    const nextType = catalog?.request_types.find((type) => type.id === requestTypeId);
    setValues((current) => ({
      ...current,
      ...CLASSIFICATION_RESET,
      // The area belongs to the request, not to the type: it stays unless the
      // new type does not ask for one.
      area_id: nextType?.asks_area === false ? "" : current.area_id,
      request_type_id: requestTypeId,
      document_request: false,
      document_category_id: "",
      document_type_ids: [],
      document_other: "",
    }));
    setFiles([]);
    resetProducts();
    clearFieldErrors(
      "request_type_id",
      "area_id",
      "subject_id",
      "cause_id",
      "subject",
      "description",
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
      ...CLASSIFICATION_RESET,
      document_request: checked,
      document_category_id: "",
      document_type_ids: [],
      document_other: "",
    }));
    // Evidence and documents exclude each other.
    if (checked) setFiles([]);
    resetProducts();
    clearFieldErrors(
      "subject_id",
      "cause_id",
      "subject",
      "description",
      "document_category_id",
      "documents",
      "document_other",
      "images"
    );
    setSubmitError(null);
  };

  const updateArea = (areaId: string) => {
    setValues((current) => ({ ...current, ...CLASSIFICATION_RESET, area_id: areaId }));
    resetProducts();
    clearFieldErrors("area_id", "subject_id", "cause_id", "subject", "description");
    setSubmitError(null);
  };

  const updateSubject = (subjectId: string) => {
    setValues((current) => ({ ...current, ...CLASSIFICATION_RESET, subject_id: subjectId }));
    resetProducts();
    clearFieldErrors("subject_id", "cause_id", "subject", "description");
    setSubmitError(null);
  };

  const updateCause = (causeId: string) => {
    const cause = classification.subject?.causes.find((item) => item.id === causeId);
    setValues((current) => ({
      ...current,
      cause_id: causeId,
      pickup_order_requested: "",
      pickup_order_number: "",
      delivery_date: "",
    }));
    if (!cause?.allows_product) resetProducts();
    // A cause that requires products opens with one line, so what it asks for
    // is in view instead of behind a button.
    else if (cause.requires_product && productLines.length === 0) resetProducts([emptyProductLine()]);
    clearFieldErrors("cause_id", "subject", "description", "products");
    setSubmitError(null);
  };

  const updateProductLines = (nextLines: PqrsfProductLine[]) => {
    // An error stays until its own field is edited, as with the other fields.
    setLineErrors((current) => {
      const next: Record<string, ProductLineErrors> = {};
      for (const line of nextLines) {
        const errors = current[line.key];
        if (!errors) continue;
        const previous = productLines.find((item) => item.key === line.key);
        const kept = { ...errors };
        for (const field of Object.keys(errors) as ProductLineField[]) {
          if (previous && lineValue(previous, field) !== lineValue(line, field)) delete kept[field];
        }
        if (Object.keys(kept).length > 0) next[line.key] = kept;
      }
      return next;
    });
    if (nextLines.length === 0) {
      setValues((current) => ({
        ...current,
        pickup_order_requested: "",
        pickup_order_number: "",
        delivery_date: "",
      }));
      clearFieldErrors("pickup_order_requested", "pickup_order_number", "delivery_date");
    }
    setProductLines(nextLines);
    if (nextLines.length !== productLines.length) clearFieldErrors("products");
    setSubmitError(null);
  };

  const updatePickupOrder = (answer: PickupOrderAnswer) => {
    setValues((current) => ({
      ...current,
      pickup_order_requested: answer,
      pickup_order_number: answer === "yes" ? current.pickup_order_number : "",
    }));
    clearFieldErrors("pickup_order_requested", "pickup_order_number");
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

    const { errors: nextErrors, lineErrors: nextLineErrors } = validateForm(
      values,
      classification,
      files,
      catalog?.limits ?? null,
      productLines
    );
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLineErrors(nextLineErrors);
      setFocusErrorSummary((current) => current + 1);
      return;
    }

    if (!selectedType) {
      setFieldErrors({ request_type_id: "Selecciona un tipo de solicitud." });
      setFocusErrorSummary((current) => current + 1);
      return;
    }

    const products = classification.allowsProducts ? productLines : [];
    const evidence = selectedType.allows_attachments && !isDocumentRequest ? files : [];
    // Without published limits only photos are offered, so everything is an image.
    const { images, videos } = catalog?.limits
      ? splitEvidence(evidence, catalog.limits)
      : { images: evidence, videos: [] };

    setIsSubmitting(true);
    try {
      const receipt = await submitPqrsfRequest(
        {
          ...values,
          sends_area: classification.sendsArea,
          full_name: values.full_name.trim(),
          business_name: values.business_name.trim(),
          nit: values.nit.trim(),
          address: values.address.trim(),
          department: values.department.trim(),
          city: values.city.trim(),
          email: values.email.trim(),
          subject: asksWrittenSubject(classification) ? values.subject.trim() : "",
          description: values.description.trim(),
          document_request: isDocumentRequest,
          document_category_id: isDocumentRequest ? values.document_category_id : "",
          document_type_ids: isDocumentRequest ? values.document_type_ids : [],
          document_other: isDocumentRequest ? values.document_other.trim() : "",
          subject_id: classification.subject?.id ?? "",
          cause_id: classification.cause?.id ?? "",
          products: products.map((line) => ({
            ...line,
            invoice_number: line.invoice_number.trim(),
            lot: line.lot.trim(),
          })),
          pickup_order_requested: products.length > 0 ? values.pickup_order_requested : "",
          pickup_order_number:
            products.length > 0 && values.pickup_order_requested === "yes"
              ? values.pickup_order_number.trim()
              : "",
          delivery_date: products.length > 0 ? values.delivery_date : "",
          images,
          videos,
        },
        crypto.randomUUID()
      );

      setSubmission(receipt);
      setValues({ ...INITIAL_VALUES });
      setFiles([]);
      setProductLines([]);
      setLineErrors({});
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
    setProductLines([]);
    setLineErrors({});
    setFieldErrors({});
    setSubmitError(null);
  };

  const subjectList = classification.visibleSubjects;
  const causes = classification.subject?.causes ?? [];
  const showWrittenSubject = asksWrittenSubject(classification);
  const descriptionRequired = requiresDescription(classification);

  return (
    <main className="min-h-dvh bg-canvas text-text-primary">
      {/* The black band is the brand's anchor over an always-light form. It
          uses the sidebar tokens, dark in every theme: white on it is 16.88:1
          and the muted text 7.52:1. */}
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-5 pb-7 md:px-6 md:pt-6 md:pb-8">
          {/* Sized at what it renders (48px tall), so the srcset does not ship
              the 1200px source. */}
          <Image
            src="/logos/full-white.png"
            alt="Juan D. Hoyos Distribuciones"
            width={126}
            height={48}
            priority
            className="h-12 w-auto"
          />
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-sidebar-muted">Presenta tu PQRSF</p>
            <h1 className="text-2xl font-semibold tracking-tight">¡Queremos escucharte!</h1>
            <p className="max-w-prose text-sm text-sidebar-muted">
              En nuestra empresa valoramos sus comentarios y sugerencias. Este formulario nos permite mejorar continuamente nuestros productos y servicios. Por favor, diligencie la siguiente información para brindarte una respuesta adecuada.
            </p>
            <StaffAccess />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">

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

                <ChoiceList
                  id="pqrsf-request-type-id"
                  name="request_type_id"
                  legend="Tipo de solicitud"
                  options={catalog.request_types}
                  value={values.request_type_id}
                  error={fieldErrors.request_type_id}
                  onChange={updateRequestType}
                />

                {/* The type decides what the rest asks for, so the rest waits
                    for it: two steps without numbering them. A disabled
                    fieldset disables every control inside it, natively. */}
                {!selectedType && (
                  <p id="pqrsf-type-first" className="text-[13px] text-text-secondary">
                    Elige el tipo de solicitud para completar el resto del formulario.
                  </p>
                )}
                <fieldset
                  disabled={!selectedType}
                  aria-label="Datos de la solicitud"
                  aria-describedby={selectedType ? undefined : "pqrsf-type-first"}
                  className="grid min-w-0 gap-x-4 gap-y-5 transition-opacity disabled:opacity-50 sm:grid-cols-2"
                >

                  <FormField id="pqrsf-site-id" label="Sede" error={fieldErrors.site_id}>
                    <Dropdown
                      id="pqrsf-site-id"
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
                      aria-describedby={describedBy("pqrsf-site-id", false, Boolean(fieldErrors.site_id))}
                      placeholder="Selecciona una sede"
                    />
                  </FormField>

                  {classification.areas.length > 0 && (
                    <FormField
                      id="pqrsf-area-id"
                      label="Área a la que va dirigida"
                      optional={Boolean(selectedType) && !classification.requiresArea}
                      hint={
                        classification.subjects.length > 0
                          ? "Te mostramos solo las novedades de esa área."
                          : undefined
                      }
                      error={fieldErrors.area_id}
                    >
                      <Dropdown
                        id="pqrsf-area-id"
                        name="area_id"
                        options={classification.areas.map((area) => ({
                          value: area.id,
                          label: area.name,
                        }))}
                        value={values.area_id}
                        onValueChange={updateArea}
                        aria-invalid={Boolean(fieldErrors.area_id)}
                        aria-required={!selectedType || classification.requiresArea}
                        aria-label="Área a la que va dirigida"
                        aria-describedby={describedBy("pqrsf-area-id", classification.subjects.length > 0, Boolean(fieldErrors.area_id))}
                        placeholder="Selecciona un área"
                      />
                    </FormField>
                  )}

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

                  {subjectList.length > 0 && (
                    <ChoiceList
                      id="pqrsf-subject-id"
                      name="subject_id"
                      legend="Asunto"
                      hint="¿Sobre qué es tu solicitud?"
                      options={subjectList}
                      value={values.subject_id}
                      error={fieldErrors.subject_id}
                      columns={2}
                      onChange={updateSubject}
                    />
                  )}

                  {causes.length > 0 && (
                    <ChoiceList
                      id="pqrsf-cause-id"
                      name="cause_id"
                      legend="Causal"
                      hint="¿Qué pasó exactamente?"
                      options={causes}
                      value={values.cause_id}
                      error={fieldErrors.cause_id}
                      columns={2}
                      onChange={updateCause}
                    />
                  )}

                  {selectedType && showWrittenSubject && (
                    <FormField
                      id="pqrsf-subject"
                      label="Asunto"
                      optional={classification.isOther}
                      error={fieldErrors.subject}
                      hint={
                        classification.isOther
                          ? "Un título corto para la novedad que no está en la lista."
                          : "Resume en pocas palabras qué necesitas."
                      }
                      className="sm:col-span-2"
                    >
                      <Input
                        id="pqrsf-subject"
                        name="subject"
                        required={!classification.isOther}
                        value={values.subject}
                        maxLength={FIELD_LIMITS.subject}
                        aria-invalid={Boolean(fieldErrors.subject)}
                        aria-describedby={describedBy("pqrsf-subject", true, Boolean(fieldErrors.subject))}
                        onChange={(event) => updateValue("subject", event.target.value)}
                        className={cn("min-h-11 sm:min-h-9", fieldErrors.subject && "border-danger")}
                      />
                    </FormField>
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
                    optional={!descriptionRequired}
                    error={fieldErrors.description}
                    hint={
                      classification.isOther
                        ? "Elegiste «Otro»: cuéntanos qué pasó para dirigir el caso al área correcta."
                        : undefined
                    }
                    className="sm:col-span-2"
                  >
                    <Textarea
                      id="pqrsf-description"
                      name="description"
                      required={descriptionRequired}
                      value={values.description}
                      maxLength={FIELD_LIMITS.description}
                      aria-invalid={Boolean(fieldErrors.description)}
                      aria-describedby={describedBy(
                        "pqrsf-description",
                        classification.isOther,
                        Boolean(fieldErrors.description)
                      )}
                      onChange={(event) => updateValue("description", event.target.value)}
                      className={cn(
                        "min-h-32 resize-y sm:min-h-28",
                        fieldErrors.description && "border-danger"
                      )}
                    />
                  </FormField>

                  {classification.allowsProducts && (
                    <ProductLinesField
                      lines={productLines}
                      required={classification.requiresProducts}
                      error={fieldErrors.products}
                      lineErrors={lineErrors}
                      pickupOrder={values.pickup_order_requested}
                      pickupOrderNumber={values.pickup_order_number}
                      pickupOrderError={fieldErrors.pickup_order_requested}
                      pickupOrderNumberError={fieldErrors.pickup_order_number}
                      onLinesChange={updateProductLines}
                      onPickupOrderChange={updatePickupOrder}
                      onPickupOrderNumberChange={(value) => updateValue("pickup_order_number", value)}
                      deliveryDate={values.delivery_date}
                      deliveryDateError={fieldErrors.delivery_date}
                      maxDeliveryDate={localToday()}
                      onDeliveryDateChange={(value) => updateValue("delivery_date", value)}
                    />
                  )}

                  {selectedType?.allows_attachments && !isDocumentRequest && (
                    <AttachmentsField
                      files={files}
                      limits={catalog.limits}
                      error={fieldErrors.images}
                      onFilesChange={updateFiles}
                      onError={setFilesError}
                    />
                  )}
                </fieldset>

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
          Si necesitas ayuda para completar el formulario, comunícate con soporte{" "}
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escribir a soporte por WhatsApp (se abre en una pestaña nueva)"
            className="rounded-sm font-medium text-text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-control"
          >
            aquí
          </a>
          .
        </p>
      </div>
    </main>
  );
}

/**
 * JDH staff file their complaints inside the platform, with their session.
 * A plain link: the public form never touches the session itself. The API's
 * login takes no return path, so the person lands on the platform's home.
 */
function StaffAccess() {
  return (
    // On the black band: outlined in the muted white (7.52:1, well over the
    // 3:1 a control needs), with the band's own hover and focus colors.
    <a
      href={LOGIN_URL}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "mt-3 h-11 whitespace-normal border-sidebar-muted text-sidebar-foreground hover:bg-sidebar-hover sm:h-9",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
      )}
    >
      <MicrosoftMark />
      ¿Eres personal JDH y tienes una queja?
    </a>
  );
}

/**
 * The Microsoft four-square mark, in the text color: the sign-in is Microsoft
 * Entra, and the monochrome mark keeps the button in the system's one accent.
 */
function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" aria-hidden="true" className="size-4 shrink-0" fill="currentColor">
      <rect x="0" y="0" width="10" height="10" />
      <rect x="11" y="0" width="10" height="10" />
      <rect x="0" y="11" width="10" height="10" />
      <rect x="11" y="11" width="10" height="10" />
    </svg>
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
          <dd className="font-mono font-medium tabular">{receipt.tracking_code ?? receipt.reference}</dd>
          <dt className="font-medium">Fecha de recepción</dt>
          <dd className="text-text-secondary">{formatCreatedAt(receipt.created_at)}</dd>
        </dl>
        {receipt.tracking_code && (
          <p className="max-w-prose text-sm text-text-secondary">Te enviamos el radicado a tu correo.</p>
        )}
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
];

function validateForm(
  values: PqrsfFormValues,
  classification: Classification,
  files: File[],
  limits: AttachmentLimits | null,
  productLines: PqrsfProductLine[]
): { errors: FieldErrors; lineErrors: Record<string, ProductLineErrors> } {
  const selectedType = classification.type;
  const errors: FieldErrors = {};
  let lineErrors: Record<string, ProductLineErrors> = {};
  for (const field of REQUIRED_TEXT_FIELDS) {
    const message = validateField(field, values, selectedType);
    if (message) errors[field] = message;
  }

  if (classification.type && classification.requiresArea && !values.area_id) {
    errors.area_id = "Elige el área a la que va dirigida tu solicitud.";
  } else if (classification.subjects.length > 0) {
    if (!classification.subject) {
      errors.subject_id = "Elige el asunto de tu solicitud.";
    } else if (classification.subject.causes.length > 0 && !classification.cause) {
      errors.cause_id = "Elige la causal que mejor describe lo que pasó.";
    }
  }

  const subject = values.subject.trim();
  if (selectedType && classification.subjects.length === 0 && !subject) {
    errors.subject = "Completa el asunto.";
  } else if (subject.length > (FIELD_LIMITS.subject ?? Infinity)) {
    errors.subject = `${FIELD_LABELS.subject} admite máximo ${FIELD_LIMITS.subject} caracteres.`;
  }

  const description = values.description.trim();
  if (selectedType && requiresDescription(classification) && !description) {
    errors.description = classification.isOther
      ? "Describe la novedad: elegiste «Otro»."
      : "Completa la descripción.";
  } else if (description.length > (FIELD_LIMITS.description ?? Infinity)) {
    errors.description = `${FIELD_LABELS.description} admite máximo ${FIELD_LIMITS.description} caracteres.`;
  }

  if (classification.allowsProducts) {
    if (classification.requiresProducts && productLines.length === 0) {
      errors.products = "Agrega al menos un producto: la causal que elegiste lo exige.";
    }
    lineErrors = validateProductLines(productLines);
    const invalid = productLines
      .map((line, index) => (lineErrors[line.key] ? index + 1 : null))
      .filter((position): position is number => position !== null);
    if (invalid.length > 0) {
      errors.products = invalid.length === 1
        ? `Completa los datos del producto ${invalid[0]}.`
        : `Completa los datos de los productos ${invalid.join(", ")}.`;
    }
    if (productLines.length > 0 && !values.pickup_order_requested) {
      errors.pickup_order_requested = "Indica si ya solicitaste la orden de recogida.";
    }
    if (productLines.length > 0) {
      if (!values.delivery_date) {
        errors.delivery_date = "Indica la fecha de entrega del pedido.";
      } else if (values.delivery_date > localToday()) {
        errors.delivery_date = "La fecha de entrega no puede ser futura.";
      }
    }
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
  } else if (selectedType?.allows_attachments && files.length > 0 && limits) {
    const message = validateFiles(files, limits);
    if (message) errors.images = message;
  }
  return { errors, lineErrors };
}

function validateProductLines(lines: PqrsfProductLine[]): Record<string, ProductLineErrors> {
  const result: Record<string, ProductLineErrors> = {};
  for (const line of lines) {
    const errors: ProductLineErrors = {};
    if (!line.product) errors.sku = "Busca la referencia y elígela de la lista.";
    if (!line.invoice_number.trim()) errors.invoice_number = "Escribe el número de la factura.";
    if (!line.lot.trim()) errors.lot = "Escribe el lote; está impreso en el empaque.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(line.expiry_date)) {
      errors.expiry_date = "Indica la fecha de vencimiento que trae el empaque.";
    }
    const quantity = Number(line.affected_quantity);
    if (!/^\d+$/.test(line.affected_quantity.trim()) || quantity < 1) {
      errors.affected_quantity = "Escribe cuántas unidades, un número entero mayor que 0.";
    }
    if (Object.keys(errors).length > 0) result[line.key] = errors;
  }
  return result;
}

function lineValue(line: PqrsfProductLine, field: ProductLineField): string {
  return field === "sku" ? line.product?.sku ?? "" : line[field];
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
    // Photos and videos are one field on screen.
    const loc = (issue.loc ?? []).map((part) => (part === "videos" ? "images" : part));
    const field = loc
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
      // A business rule answers with one sentence that says what to fix; only
      // the field-by-field validation needs pointing at the marked fields.
      return error.issues.length > 0
        ? "Hay datos que necesitan corrección. Revisa los campos marcados."
        : error.detail;
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

/** Today on the requester's device, as AAAA-MM-DD (not UTC, which runs ahead at night). */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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
