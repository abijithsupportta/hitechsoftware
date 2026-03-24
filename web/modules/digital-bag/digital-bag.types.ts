// ─────────────────────────────────────────────────────────────────────────────
// digital-bag.types.ts — Digital Bag Module Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Status unions ────────────────────────────────────────────────────────────

export type SessionStatus = 'open' | 'closed';
export type BagSessionStatus = 'open' | 'closed' | 'variance_review';
export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'disputed';

// ── Digital Bag Session ──────────────────────────────────────────────────────

export interface DigitalBagSession {
  id: string;
  technician_id: string;
  issued_by: string;
  session_date: string;
  status: SessionStatus;
  total_issued: number;
  total_returned: number;
  total_consumed: number;
  variance: number;
  total_damage_fees: number;
  notes: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
  technician?: { id: string; display_name: string; email: string; phone_number?: string | null } | null;
  issuer?: { id: string; display_name: string } | null;
  items?: DigitalBagItem[];
}

export interface DigitalBagSessionWithProfiles extends DigitalBagSession {}
export interface DigitalBagSessionDetail extends DigitalBagSession {}

// ── Digital Bag Item ─────────────────────────────────────────────────────────

export interface DigitalBagItem {
  id: string;
  session_id: string;
  product_id: string;
  material_code: string;
  product_name: string;
  mrp: number;
  quantity_issued: number;
  quantity_returned: number;
  quantity_consumed: number;
  quantity_missing: number;
  damage_fee_per_unit: number | null;
  total_damage_fee: number | null;
  is_checked: boolean;
  added_by: string | null;
  added_at: string;
  created_at: string;
  updated_at: string;
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

// ── Input types ──────────────────────────────────────────────────────────────

export interface CreateSessionInput {
  technician_id: string;
}

export interface AddItemInput {
  session_id: string;
  product_id: string;
  quantity: number;
}

export interface CloseItemDetail {
  item_id: string;
  quantity_returned: number;
  damage_fee_per_unit?: number;
}

export interface CloseSessionInput {
  session_id: string;
  items: CloseItemDetail[];
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

// ── Capacity & Product ───────────────────────────────────────────────────────

export interface BagCapacityStatus {
  total_capacity: number;
  items_issued: number;
  remaining: number;
  is_full: boolean;
}

export interface AvailableProduct {
  product_id: string;
  material_code: string;
  product_name: string;
  mrp: number | null;
  current_quantity: number;
  description: string | null;
}

// ── Filter / list types ──────────────────────────────────────────────────────

export interface SessionHistoryFilters {
  technician_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface SessionListResponse {
  data: DigitalBagSession[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BagSessionFilters {
  technician_id?: string;
  status?: BagSessionStatus;
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

// ── Payout types (shared with payout module — do not remove) ─────────────────

export interface TechnicianServicePayout {
  id: string;
  technician_id: string;
  subject_id: string | null;
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

export interface PayoutWithDetails extends TechnicianServicePayout {
  technician: { id: string; display_name: string; email: string } | null;
  subject: { id: string; ticket_number: string | null } | null;
  approver: { id: string; display_name: string } | null;
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

export interface PayoutFilters {
  technician_id?: string;
  status?: PayoutStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface PayoutListResponse {
  data: PayoutWithDetails[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Technician bag summary ───────────────────────────────────────────────────

export interface TechnicianBagSummary {
  session_id: string;
  session_date: string;
  status: BagSessionStatus;
  items: DigitalBagItem[];
  total_held: number;
  capacity_remaining: number;
}
