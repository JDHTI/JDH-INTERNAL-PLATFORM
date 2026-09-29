import { apiFetch } from "@/shared/lib/api-client";

import type {
  PqrsfCatalog,
  PqrsfReceipt,
  PqrsfSubmission,
} from "../types/pqrsf-public.types";

export function getPqrsfCatalog(): Promise<PqrsfCatalog> {
  return apiFetch<PqrsfCatalog>("/public/pqrsf/catalogs", {
    publicRequest: true,
  });
}

export function submitPqrsfRequest(
  input: PqrsfSubmission,
  idempotencyKey: string
): Promise<PqrsfReceipt> {
  const form = new FormData();

  form.append("request_type_id", input.request_type_id);
  form.append("site_id", input.site_id);
  form.append("full_name", input.full_name);
  form.append("business_name", input.business_name);
  form.append("nit", input.nit);
  form.append("address", input.address);
  form.append("department", input.department);
  form.append("city", input.city);
  form.append("email", input.email);
  form.append("subject", input.subject);
  form.append("description", input.description);

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

  return apiFetch<PqrsfReceipt>("/public/pqrsf/requests", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: form,
    publicRequest: true,
  });
}
