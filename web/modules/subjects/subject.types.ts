// ─────────────────────────────────────────────────────────────────────────────
// subject.types.ts
//
// Central type definitions for the Subject (service job) domain.
// Every screen, API route, repository query, and React hook that touches a
// service job imports its types from here — keeping the contract in one place.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Where this service job originated from.
 * - 'brand'  → complaint raised by a product brand (manufacturer)
 * - 'dealer' → complaint raised by or through a dealer
 * Determines which foreign key (brand_id / dealer_id) is required on the form.
 */
export type SubjectSourceType = 'brand' | 'dealer';

/**
 * Urgency level of the service job.
 * Shown as a coloured badge on the list and detail pages.
 * Also used by the overdue queue to highlight critical pending jobs.
 */
export type SubjectPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Whether the technician visit is for a brand-new installation
 * or a routine / corrective service call.
 */
export type SubjectTypeOfService = 'installation' | 'service';

/**
 * Predefined warranty durations selectable from the warranty form.
 * 'custom' allows the admin to enter an exact warranty_end_date manually
 * instead of letting the system calculate it from purchase_date.
 */
export type WarrantyPeriod = '6_months' | '1_year' | '2_years' | '3_years' | '4_years' | '5_years' | 'custom';

/**
 * Categories of photos the technician must upload during a job.
 * The required set depends on warranty status:
 *   - In-warranty / AMC: serial_number, machine, bill, job_sheet, defective_part, service_video (6 types)
 *   - Out-of-warranty:   serial_number, machine, bill (3 types)
 * site_photo_1/2/3 are optional additional shots.
 */
export type PhotoType = 'serial_number' | 'machine' | 'bill' | 'job_sheet' | 'defective_part' | 'site_photo_1' | 'site_photo_2' | 'site_photo_3' | 'service_video';

/**
 * Reasons a technician can select when marking a job INCOMPLETE.
 * The UI shows these as a dropdown; 'other' requires a mandatory text note.
 * 'spare_parts_not_available' additionally requires a parts list with name, qty, price.
 */
export type IncompleteReason = 'customer_cannot_afford' | 'power_issue' | 'door_locked' | 'spare_parts_not_available' | 'site_not_ready' | 'other';

/**
 * Payment method used when the technician collects fees from the customer.
 * Stored on the subject record after the bill is generated.
 */
export type PaymentMode = 'cash' | 'upi' | 'card' | 'cheque';

/**
 * Lightweight subject record used in the paginated list view.
 * Contains only the fields needed to render each row in the table:
 * customer info, status badges, assignment details, and billing status.
 * Full detail is fetched separately when the user opens a specific job.
 */
export interface SubjectListItem {
  id: string;
  subject_number: string;
  source_type: SubjectSourceType;
  source_name: string;
  assigned_technician_id: string | null;
  assigned_technician_name: string | null;
  assigned_technician_code: string | null;
  priority: SubjectPriority;
  status: string;
  allocated_date: string;
  technician_allocated_date: string | null;
  technician_allocated_notes: string | null;
  technician_acceptance_status: 'pending' | 'accepted' | 'rejected';
  is_rejected_pending_reschedule: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  category_name: string | null;
  type_of_service: SubjectTypeOfService;
  service_charge_type: 'customer' | 'brand_dealer';
  is_amc_service: boolean;
  is_warranty_service: boolean;
  billing_status: 'not_applicable' | 'due' | 'partially_paid' | 'paid' | 'waived';
  created_at: string;
}

/**
 * Full subject record loaded on the Subject Detail page.
 * Extends SubjectListItem with every additional field:
 * - product & warranty information
 * - AMC (Annual Maintenance Contract) dates
 * - job workflow timestamps (arrived_at, work_started_at, completed_at …)
 * - incomplete / spare-parts details when a job couldn't be finished
 * - billing totals and payment collection flags
 * - the complete photo list embedded directly (no separate fetch needed)
 * - the full activity timeline for the audit trail
 */
export interface SubjectDetail extends SubjectListItem {
  brand_id: string | null;
  dealer_id: string | null;
  category_id: string | null;
  priority_reason: string;
  customer_name: string | null;
  customer_address: string | null;
  product_name: string | null;
  serial_number: string | null;
  product_description: string | null;
  purchase_date: string | null;
  warranty_period_months: number | null;
  warranty_end_date: string | null;
  warranty_status: 'active' | 'expired' | null;
  amc_start_date: string | null;
  amc_end_date: string | null;
  service_charge_type: 'customer' | 'brand_dealer';
  is_amc_service: boolean;
  is_warranty_service: boolean;
  billing_status: 'not_applicable' | 'due' | 'partially_paid' | 'paid' | 'waived';
  technician_rejection_reason: string | null;
  rejected_by_technician_id: string | null;
  rejected_by_technician_name: string | null;
  en_route_at: string | null;
  arrived_at: string | null;
  work_started_at: string | null;
  completed_at: string | null;
  incomplete_at: string | null;
  incomplete_reason: IncompleteReason | null;
  incomplete_note: string | null;
  spare_parts_requested: string | null;
  spare_parts_quantity: number | null;
  completion_proof_uploaded: boolean;
  completion_notes: string | null;
  rescheduled_date: string | null;
  visit_charge?: number | null;
  service_charge?: number | null;
  accessories_total?: number | null;
  grand_total?: number | null;
  payment_mode?: PaymentMode | null;
  payment_collected?: boolean;
  payment_collected_at?: string | null;
  bill_generated?: boolean;
  bill_generated_at?: string | null;
  bill_number?: string | null;
  photos: SubjectPhoto[];
  created_by: string | null;
  assigned_by: string | null;
  timeline: SubjectTimelineItem[];
}

/**
 * A single entry in the activity/audit timeline shown at the bottom of the
 * Subject Detail page. Each row records who changed what and when — used to
 * give admins and technicians a full history of every status transition,
 * assignment change, or note added to the job.
 */
export interface SubjectTimelineItem {
  id: string;
  event_type: string;
  status: string;
  changed_at: string;
  note: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
}

/**
 * All filter parameters that can be applied to the subject list query.
 * Passed from the list page UI → service layer → repository → Supabase.
 * Each optional field corresponds to a filter control on the list page.
 *
 * Queue modes (mutually exclusive, controlled by ?queue= URL param):
 *   pending_only   → incomplete work (no completed_at)
 *   overdue_only   → past due date, assigned, not rescheduled
 *   due_only       → completed customer-pay bills awaiting collection
 */
export interface SubjectListFilters {
  search?: string;
  source_type?: SubjectSourceType | 'all';
  priority?: SubjectPriority | 'all';
  status?: string;
  category_id?: string;
  brand_id?: string;
  dealer_id?: string;
  from_date?: string;
  to_date?: string;
  /** Filter by technician_allocated_date (used for technician role to see today's assignments) */
  technician_date?: string;
  /** When set, only return subjects assigned to this technician user ID. */
  assigned_technician_id?: string;
  /** Restrict technician views to active work queue (non-terminal statuses). */
  technician_pending_only?: boolean;
  /** Show unfinished work queue using schema-safe criteria. */
  pending_only?: boolean;
  /** Show only overdue pending technician-assigned subjects. */
  overdue_only?: boolean;
  /** Show customer-chargeable completed subjects that are pending payment collection. */
  due_only?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Paginated response envelope returned by getSubjects().
 * The data array contains enriched SubjectListItem records
 * (technician names already joined in the service layer).
 */
export interface SubjectListResponse {
  data: SubjectListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Shape of the subject creation / edit form (react-hook-form values).
 * Cross-field validation rules (enforced by Zod):
 *   - brand_id required when source_type === 'brand'
 *   - dealer_id required when source_type === 'dealer'
 *   - warranty_end_date must be after purchase_date
 *   - amc_start_date required if amc_end_date is provided
 *   - amc_end_date must be after amc_start_date
 */
export interface SubjectFormValues {
  subject_number: string;
  source_type: SubjectSourceType;
  brand_id?: string;
  dealer_id?: string;
  assigned_technician_id?: string;
  priority: SubjectPriority;
  priority_reason: string;
  allocated_date: string;
  type_of_service: SubjectTypeOfService;
  category_id: string;
  customer_phone?: string;
  customer_name?: string;
  customer_address?: string;
  product_name?: string;
  serial_number?: string;
  product_description?: string;
  purchase_date?: string;
  warranty_end_date?: string;
  amc_start_date?: string;
  amc_end_date?: string;
}

/**
 * Payload for creating a new subject.
 * Extends the form values with created_by (the authenticated user's UUID)
 * which is appended server-side before the Supabase RPC call.
 */
export interface CreateSubjectInput extends SubjectFormValues {
  created_by: string; // UUID of the office staff / admin who raised this ticket
}

/** Payload for updating an existing subject — same fields as the create form. */
export type UpdateSubjectInput = SubjectFormValues;

/**
 * Input for the full technician assignment operation.
 * Used by the AssignTechnicianForm on the Subject Detail page.
 * Includes the visit date and notes in addition to the technician ID,
 * so the system can set the technician_allocated_date and reset stale
 * completion / billing fields from any previous attempt.
 */
export interface AssignTechnicianInput {
  subject_id: string;
  technician_id: string | null;
  technician_allocated_date: string | null;  // ISO date string YYYY-MM-DD
  technician_allocated_notes: string | null;
  assigned_by: string;
}

/**
 * A single photo or video file attached to a subject.
 * Files are stored in the Supabase Storage bucket 'subject-photos'.
 * public_url is the CDN-accessible URL used directly in <img> / <video> tags.
 * photo_type determines whether this counts toward the completion requirements.
 */
export interface SubjectPhoto {
  id: string;
  subject_id: string;
  photo_type: PhotoType;
  storage_path: string;
  public_url: string;
  uploaded_by: string | null;
  uploaded_at: string;
  file_size_bytes: number | null;
  mime_type: string | null;
}

/**
 * Tracks upload progress for a single photo in the UI.
 * Used to show a progress bar per photo type while the file is being
 * uploaded to Supabase Storage via the /api/subjects/[id]/photos/upload route.
 */
export interface PhotoUploadProgress {
  photoType: PhotoType;
  progress: number; // 0–100 percentage complete
  isUploading: boolean;
}

/**
 * Result of the photo completion check run before a technician can mark a
 * job as COMPLETED. Returned by GET /api/subjects/[id]/workflow.
 * canComplete is false whenever missing[] is non-empty — the UI uses this
 * to disable the 'Complete Job' button and show which photos are still needed.
 */
export interface JobCompletionRequirements {
  required: PhotoType[];
  uploaded: PhotoType[];
  missing: PhotoType[];
  canComplete: boolean;
}

/**
 * Input sent by the technician when marking a job INCOMPLETE.
 * Validated server-side in subject.job-workflow.ts:
 *   - reason must be one of the six IncompleteReason values
 *   - note is mandatory (≥10 chars) when reason === 'other'
 *   - spare part details required when reason === 'spare_parts_not_available'
 */
export interface IncompleteJobInput {
  reason: IncompleteReason;
  note: string;
  sparePartsRequested?: string;
  sparePartsQuantity?: number;
  sparePartsItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  rescheduledDate?: string; // ISO date string YYYY-MM-DD
}

export interface SubjectAccessory {
  id: string;
  subject_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  added_by: string | null;
  created_at: string;
}

export interface SubjectBill {
  id: string;
  subject_id: string;
  bill_number: string;
  bill_type: 'customer_receipt' | 'brand_dealer_invoice';
  issued_to: string;
  issued_to_type: 'customer' | 'brand_dealer';
  brand_id: string | null;
  dealer_id: string | null;
  visit_charge: number;
  service_charge: number;
  accessories_total: number;
  grand_total: number;
  payment_mode: PaymentMode | null;
  payment_status: 'paid' | 'due' | 'waived';
  payment_collected_at: string | null;
  generated_by: string | null;
  generated_at: string;
}

export interface AddAccessoryInput {
  item_name: string;
  quantity: number;
  unit_price: number;
}

export interface GenerateBillInput {
  visit_charge?: number;
  service_charge?: number;
  accessories: AddAccessoryInput[];
  payment_mode?: PaymentMode;
  apply_gst?: boolean;
}

export interface EditBillInput {
  visit_charge: number;
  service_charge: number;
  apply_gst: boolean;
  payment_mode?: PaymentMode | null;
  accessories_to_add?: AddAccessoryInput[];
  accessories_to_remove?: string[];
}

export interface BillSummary {
  bill_number: string;
  bill_type: 'customer_receipt' | 'brand_dealer_invoice';
  issued_to: string;
  grand_total: number;
  payment_status: 'paid' | 'due' | 'waived';
  generated_at: string;
}

/** All valid status values for the job workflow. */
export type JobWorkflowStatus =
  | 'PENDING'
  | 'ALLOCATED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'INCOMPLETE'
  | 'AWAITING_PARTS'
  | 'RESCHEDULED'
  | 'CANCELLED';

/** Service-layer input for marking a job incomplete (camelCase field names). */
export interface MarkIncompleteInput {
  reason: IncompleteReason;
  note?: string;
  spare_parts_requested?: string;
  spare_parts_quantity?: number;
  rescheduled_date?: string;
}

/** Service-layer input for completing a job. */
export interface CompleteJobInput {
  completion_notes?: string;
}

/** Return value from a successful photo upload. */
export interface PhotoUploadResult {
  storage_path: string;
  public_url: string;
  photo_type: PhotoType;
  file_size_bytes: number;
}

/** Result of a completion requirements check (snake_case variant). */
export interface RequiredPhotosCheck {
  required: PhotoType[];
  uploaded: PhotoType[];
  missing: PhotoType[];
  can_complete: boolean;
}

