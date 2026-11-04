export interface PqrsfRequestType {
  id: string;
  code: string;
  name: string;
  /** Only petitions: the customer can say they are asking for documents. */
  allows_document_request: boolean;
  allows_attachments: boolean;
  /** One short line shown under the option, always visible (at most 120 characters). */
  description: string | null;
  /** The customer says which area the request is for (all but compliments). Absent on an older API. */
  asks_area?: boolean;
}

export interface PqrsfCause {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** «Otro»: the description becomes required. */
  is_other: boolean;
  allows_product: boolean;
  requires_product: boolean;
}

export interface PqrsfSubject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** Codes of the request types that offer it. */
  request_type_codes: string[];
  is_other: boolean;
  causes: PqrsfCause[];
  /** The area that attends it; only narrows the list, the cause still routes the case. */
  dependency_id?: string | null;
}

/** An area the subjects belong to, offered to narrow the list of subjects. */
export interface PqrsfDependency {
  id: string;
  code: string;
  name: string;
}

/** A product found by reference or name. The public search never sends the supplier. */
export interface PqrsfProductOption {
  sku: string;
  description: string | null;
}

export type PickupOrderAnswer = "yes" | "no" | "unknown";

/** A product line as the form holds it, before it is sent. */
export interface PqrsfProductLine {
  /** Only for React keys: lines are added and removed in any order. */
  key: string;
  invoice_number: string;
  product: PqrsfProductOption | null;
  lot: string;
  /** AAAA-MM-DD, as the date input gives it. */
  expiry_date: string;
  affected_quantity: string;
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
  subjects: PqrsfSubject[];
  /** Areas of the subjects. Empty from an API that does not publish them: then there is no area filter. */
  dependencies: PqrsfDependency[];
  /** What evidence the form takes. Null from an API that does not publish it. */
  limits: AttachmentLimits | null;
}

/** Evidence the public form accepts. Sizes are in MB of 1024 × 1024 bytes. */
export interface AttachmentLimits {
  max_images: number;
  max_image_mb: number;
  max_total_image_mb: number;
  /** Without the dot: "jpg", "png". */
  image_extensions: string[];
  max_videos: number;
  max_video_mb: number;
  video_extensions: string[];
}

export interface PqrsfFormValues {
  request_type_id: string;
  site_id: string;
  /**
   * The area the request is for. It narrows the subjects on screen, and is sent
   * as `dependency_id` where the type asks for it; the cause still routes a case
   * that has one.
   */
  area_id: string;
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
  subject_id: string;
  cause_id: string;
  pickup_order_requested: PickupOrderAnswer | "";
  pickup_order_number: string;
  /** AAAA-MM-DD: when the order with the products was delivered; required with products. */
  delivery_date: string;
}

export interface PqrsfSubmission extends PqrsfFormValues {
  /** Whether `area_id` goes to the API (only types with `asks_area`). */
  sends_area?: boolean;
  images?: File[];
  videos?: File[];
  products?: PqrsfProductLine[];
}

export interface PqrsfReceipt {
  id: string;
  reference: string;
  /** The case consecutive (Q26MD0012), the number the customer quotes. Null if the case could not be opened yet. */
  tracking_code?: string | null;
  created_at: string;
}

/** Fields that hold a string, the ones the generic text handlers work on. */
export type PqrsfTextField = {
  [Field in keyof PqrsfFormValues]: PqrsfFormValues[Field] extends string ? Field : never;
}[keyof PqrsfFormValues];

/** Where an error can be shown: a text field, the attachments, the document choice or the products. */
export type PqrsfErrorField = PqrsfTextField | "images" | "documents" | "products";
