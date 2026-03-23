// ─────────────────────────────────────────────────────────────────────────────
// digital-bag.types.ts
//
// TypeScript types for the Digital Bag module. Mirrors the database schema
// from migration 019. All nullable DB columns are typed `X | null`.
// ─────────────────────────────────────────────────────────────────────────────

// ── Status unions ────────────────────────────────────────────────────────────

export type BagSessionStatus = 'open' | 'closed' | 'variance_review';
export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'disputed';

// ── Digital Bag Session ──────────────────────────────────────────────────────

export interface DigitalBagSession {
  id: string;
  technician_id: string;
  issued_by: string;
  session_date: string;
  status: BagSessionStatus;
  total_issued: number;
  total_returned: number;
  total_consumed: number;
  variance: number;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Session with resolved technician and issuer profile names. */
export interface DigitalBagSessionWithProfiles extends DigitalBagSession {
  technician: { id: string; display_name: string; email: string } | null;
  issuer: { id: string; display_name: string } | null;
}

/** Session with embedded items (for detail view). */
export interface DigitalBagSessionDetail extends DigitalBagSessionWithProfiles {
  items: DigitalBagItem[];
}

// ── Digital Bag Item ─────────────────────────────────────────────────────────

export interface DigitalBagItem {
  id: string;
  session_id: string;
  product_id: string;
  material_code: string;
  quantity_issued: number;
  quantity_returned: number;
  quantity_consumed: number;
  created_at: string;
  updated_at: string;
  product: { id: string; product_name: string; material_code: string } | null;
}

// ── Digital Bag Consumption ──────────────────────────────────────────────────

export interface DigitalBagConsumption {
  id: string;
  bag_item_id: string;
  subject_id: string;
  technician_id: string;
  quantity: number;
  notes: string | null;
  consumed_at: string;
}

// ── Technician Service Payout ────────────────────────────────────────────────

export interface TechnicianServicePayout {
  id: string;
  technician_id: string;
  subject_id: string;
  base_amount: number;
  deductions: number;
  variance_deduction: number;
  final_amount: number;
  status: PayoutStatus;
  notes: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Payout with resolved profile and subject info. */
export interface PayoutWithDetails extends TechnicianServicePayout {
  technician: { id: string; display_name: string; email: string } | null;
  subject: { id: string; ticket_number: string | null } | null;
  approver: { id: string; display_name: string } | null;
}

// ── Input types ──────────────────────────────────────────────────────────────

export interface CreateSessionInput {
  technician_id: string;
  session_date?: string;
  notes?: string;
  items: CreateBagItemInput[];
}

export interface CreateBagItemInput {
  product_id: string;
  material_code: string;
  quantity_issued: number;
}

export interface ReturnItemsInput {
  bag_item_id: string;
  quantity_returned: number;
}

export interface ConsumeItemInput {
  bag_item_id: string;
  subject_id: string;
  quantity: number;
  notes?: string;
}

export interface CloseSessionInput {
  session_id: string;
  notes?: string;
}

export interface CreatePayoutInput {
  technician_id: string;
  subject_id: string;
  base_amount: number;
  deductions?: number;
  variance_deduction?: number;
  notes?: string;
}

export interface UpdatePayoutInput {
  status?: PayoutStatus;
  base_amount?: number;
  deductions?: number;
  variance_deduction?: number;
  notes?: string;
}

// ── Filter / list types ──────────────────────────────────────────────────────

export interface BagSessionFilters {
  technician_id?: string;
  status?: BagSessionStatus;
  page?: number;
  page_size?: number;
}

export interface PayoutFilters {
  technician_id?: string;
  status?: PayoutStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface BagSessionListResponse {
  data: DigitalBagSessionWithProfiles[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PayoutListResponse {
  data: PayoutWithDetails[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Technician bag summary (items currently held). */
export interface TechnicianBagSummary {
  session_id: string;
  session_date: string;
  status: BagSessionStatus;
  items: DigitalBagItem[];
  total_held: number;
  capacity_remaining: number;
}
