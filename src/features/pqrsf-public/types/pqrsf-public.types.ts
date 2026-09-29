export interface PqrsfRequestType {
  id: string;
  code: string;
  name: string;
  /** Only petitions: the customer can say they are asking for documents. */
  allows_document_request: boolean;
  allows_attachments: boolean;
}

export interface PqrsfSite {
  id: string;
  code: string;
  name: string;
}

export interface PqrsfDocumentOption {
  id: string;
  name: string;
}

export interface PqrsfDocumentCategory {
  id: string;
  code: string;
  name: string;
  documents: PqrsfDocumentOption[];
}

export interface PqrsfCatalog {
  request_types: PqrsfRequestType[];
  sites: PqrsfSite[];
  document_categories: PqrsfDocumentCategory[];
}

export interface PqrsfFormValues {
  request_type_id: string;
  site_id: string;
  full_name: string;
  business_name: string;
  nit: string;
  address: string;
  department: string;
  city: string;
  email: string;
  subject: string;
  description: string;
  document_request: boolean;
  document_category_id: string;
  document_type_ids: string[];
  document_other: string;
}

export interface PqrsfSubmission extends PqrsfFormValues {
  images?: File[];
}

export interface PqrsfReceipt {
  id: string;
  reference: string;
  created_at: string;
}

/** Fields that hold a string, the ones the generic text handlers work on. */
export type PqrsfTextField = {
  [Field in keyof PqrsfFormValues]: PqrsfFormValues[Field] extends string ? Field : never;
}[keyof PqrsfFormValues];

/** Where an error can be shown: a text field, the attachments or the document choice. */
export type PqrsfErrorField = PqrsfTextField | "images" | "documents";
