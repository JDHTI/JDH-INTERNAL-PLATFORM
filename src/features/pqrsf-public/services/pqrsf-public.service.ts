import { apiFetch } from "@/shared/lib/api-client";

import type {
  PqrsfCatalog,
  PqrsfProductOption,
  PqrsfReceipt,
  PqrsfSubmission,
} from "../types/pqrsf-public.types";

export async function getPqrsfCatalog(): Promise<PqrsfCatalog> {
  const catalog = await apiFetch<PqrsfCatalog>("/public/pqrsf/catalogs", {
    publicRequest: true,
  });
  // An API without the classification catalog still serves the form: every
  // type then asks for a written subject, as it did before.
  return {
    ...catalog,
    subjects: catalog.subjects ?? [],
    dependencies: catalog.dependencies ?? [],
    limits: catalog.limits ?? null,
  };
}

export function searchPqrsfProducts(
  term: string,
  signal?: AbortSignal
): Promise<PqrsfProductOption[]> {
  return apiFetch<PqrsfProductOption[]>("/public/pqrsf/products", {
    query: { q: term, limit: 10 },
    publicRequest: true,
    signal,
  });
}

export function submitPqrsfRequest(
  input: PqrsfSubmission,
  idempotencyKey: string
): Promise<PqrsfReceipt> {
  const form = new FormData();

  form.append("request_type_id", input.request_type_id);
  form.append("site_id", input.site_id);
  if (input.sends_area && input.area_id) form.append("dependency_id", input.area_id);
  form.append("full_name", input.full_name);
  form.append("business_name", input.business_name);
  form.append("nit", input.nit);
  form.append("address", input.address);
  form.append("department", input.department);
  form.append("city", input.city);
  form.append("email", input.email);
  // Both are optional once a subject and cause are picked; an empty field is
  // left out instead of sent blank.
  if (input.subject) form.append("subject", input.subject);
  if (input.description) form.append("description", input.description);

  if (input.subject_id) {
    form.append("subject_id", input.subject_id);
    if (input.cause_id) form.append("cause_id", input.cause_id);
  }

  const products = input.products ?? [];
  if (products.length > 0) {
    form.append(
      "products",
      JSON.stringify(
        products.map((line) => ({
          invoice_number: line.invoice_number,
          sku: line.product?.sku ?? "",
          lot: line.lot,
          expiry_date: line.expiry_date,
          affected_quantity: Number(line.affected_quantity),
        }))
      )
    );
    if (input.pickup_order_requested) {
      form.append("pickup_order_requested", input.pickup_order_requested);
    }
    if (input.pickup_order_requested === "yes" && input.pickup_order_number) {
      form.append("pickup_order_number", input.pickup_order_number);
    }
  }

  if (input.document_request) {
    form.append("document_request", "true");
    form.append("document_category_id", input.document_category_id);
    for (const id of input.document_type_ids) {
      form.append("document_type_ids", id);
    }
    if (input.document_other) {
      form.append("document_other", input.document_other);
    }
  }

  for (const image of input.images ?? []) {
    form.append("images", image, image.name);
  }
  for (const video of input.videos ?? []) {
    form.append("videos", video, video.name);
  }

  return apiFetch<PqrsfReceipt>("/public/pqrsf/requests", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: form,
    publicRequest: true,
  });
}
