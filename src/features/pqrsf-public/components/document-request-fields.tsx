"use client";

import { cn } from "@/shared/lib/utils";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";

import type { PqrsfDocumentCategory } from "../types/pqrsf-public.types";
import { FormField, describedBy } from "./form-field";

export const DOCUMENT_OTHER_LIMIT = 300;

/**
 * What a customer fills in when the petition is a request for documents: the
 * category narrows the catalog to the documents that belong to it, and anything
 * missing from the list is written as free text. With this the case is opened
 * already classified, with its documents and response times.
 */
export default function DocumentRequestFields({
  categories,
  categoryId,
  documentIds,
  other,
  categoryError,
  documentsError,
  otherError,
  onCategoryChange,
  onToggleDocument,
  onOtherChange,
}: {
  categories: PqrsfDocumentCategory[];
  categoryId: string;
  documentIds: string[];
  other: string;
  categoryError?: string;
  documentsError?: string;
  otherError?: string;
  onCategoryChange: (id: string) => void;
  onToggleDocument: (id: string, checked: boolean) => void;
  onOtherChange: (value: string) => void;
}) {
  const category = categories.find((item) => item.id === categoryId);

  return (
    <>
      <FormField
        id="pqrsf-document-category-id"
        label="Categoría del documento"
        error={categoryError}
        className="sm:col-span-2"
      >
        <Dropdown
          id="pqrsf-document-category-id"
          name="document_category_id"
          options={categories.map((item) => ({ value: item.id, label: item.name }))}
          value={categoryId}
          onValueChange={onCategoryChange}
          aria-invalid={Boolean(categoryError)}
          aria-required="true"
          aria-label="Categoría del documento"
          aria-describedby={describedBy("pqrsf-document-category-id", false, Boolean(categoryError))}
          placeholder="Selecciona una categoría"
        />
      </FormField>

      {category && (
        <fieldset
          aria-describedby={describedBy("pqrsf-documents", true, Boolean(documentsError))}
          className="flex flex-col gap-1.5 sm:col-span-2"
        >
          <legend className="mb-1.5 text-[13px] font-medium leading-[1.4]">
            Documentos que necesitas
            <span className="ml-0.5 text-danger" aria-hidden="true">*</span>
          </legend>
          <ul
            id="pqrsf-documents"
            tabIndex={-1}
            className={cn(
              "grid max-h-60 gap-0.5 overflow-y-auto rounded-md border border-border-control p-1.5 sm:grid-cols-2",
              documentsError && "border-danger"
            )}
          >
            {category.documents.map((document) => (
              <li key={document.id}>
                <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-sm px-2 py-2 text-sm hover:bg-canvas-subtle sm:min-h-9 sm:py-1.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                    checked={documentIds.includes(document.id)}
                    onChange={(event) => onToggleDocument(document.id, event.target.checked)}
                  />
                  <span className="min-w-0 break-words">{document.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <p id="pqrsf-documents-hint" className="text-[13px] text-text-secondary">
            Puedes marcar varios.
          </p>
          {documentsError && (
            <p id="pqrsf-documents-error" className="text-[13px] text-danger">
              {documentsError}
            </p>
          )}
        </fieldset>
      )}

      {category && (
        <FormField
          id="pqrsf-document-other"
          label="Otro documento"
          optional
          error={otherError}
          hint="Si no está en la lista, escríbelo aquí."
          className="sm:col-span-2"
        >
          <Input
            id="pqrsf-document-other"
            name="document_other"
            value={other}
            maxLength={DOCUMENT_OTHER_LIMIT}
            aria-invalid={Boolean(otherError)}
            aria-describedby={describedBy("pqrsf-document-other", true, Boolean(otherError))}
            onChange={(event) => onOtherChange(event.target.value)}
            className={cn("min-h-11 sm:min-h-9", otherError && "border-danger")}
          />
        </FormField>
      )}
    </>
  );
}
