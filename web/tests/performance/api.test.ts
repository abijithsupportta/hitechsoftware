import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as attendanceTogglePost } from '@/app/api/attendance/toggle/route';
import { POST as billingPost } from '@/app/api/subjects/[id]/billing/route';
import { POST as workflowPost } from '@/app/api/subjects/[id]/workflow/route';

const createServerClientMock = vi.fn();
const createAdminClientMock = vi.fn();
const updateJobStatusMock = vi.fn();
const markJobIncompleteMock = vi.fn();
const markJobCompleteMock = vi.fn();
const getRequiredPhotosMock = vi.fn();
const checkCompletionRequirementsMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createServerClientMock(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}));

vi.mock('@/modules/subjects/subject.job-workflow', () => ({
  updateJobStatus: (...args: unknown[]) => updateJobStatusMock(...args),
  markJobIncomplete: (...args: unknown[]) => markJobIncompleteMock(...args),
  markJobComplete: (...args: unknown[]) => markJobCompleteMock(...args),
  getRequiredPhotos: (...args: unknown[]) => getRequiredPhotosMock(...args),
  checkCompletionRequirements: (...args: unknown[]) => checkCompletionRequirementsMock(...args),
}));

function chain(response: { data?: unknown; error?: { message: string } | null }) {
  const api = {
    select: vi.fn(() => api),
    eq: vi.fn(() => api),
    update: vi.fn(() => api),
    insert: vi.fn(() => api),
    delete: vi.fn(() => api),
    single: vi.fn(async () => ({ data: response.data ?? null, error: response.error ?? null })),
    maybeSingle: vi.fn(async () => ({ data: response.data ?? null, error: response.error ?? null })),
  };
  return api;
}

function makeServerClient(role = 'technician', userId = 'tech-1') {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: userId } }, error: null })),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return chain({ data: { id: userId, role } });
      }
      return chain({ data: null });
    }),
  };
}

describe('Suite 8 API route performance', () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
    createAdminClientMock.mockReset();
    updateJobStatusMock.mockReset();
    markJobIncompleteMock.mockReset();
    markJobCompleteMock.mockReset();
    getRequiredPhotosMock.mockReset();
    checkCompletionRequirementsMock.mockReset();
  });

  it('Test 8.1 — Workflow API rejects invalid status transition with 400', async () => {
    createServerClientMock.mockReturnValue(makeServerClient());
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => chain({ data: { id: 'subject-1', assigned_technician_id: 'tech-1', status: 'PENDING' } })),
    });
    updateJobStatusMock.mockResolvedValue({
      ok: false,
      error: { message: 'Cannot mark as arrived: current status is PENDING. Allowed transitions: none' },
    });

    const request = new Request('http://localhost/api/subjects/subject-1/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_status', status: 'ARRIVED' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await workflowPost(request as never, { params: Promise.resolve({ id: 'subject-1' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.message).toContain('current status is PENDING');
  });

  it('Test 8.2 — Workflow API rejects wrong technician with 403', async () => {
    createServerClientMock.mockReturnValue(makeServerClient('technician', 'tech-1'));
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => chain({ data: { id: 'subject-1', assigned_technician_id: 'tech-2', status: 'ACCEPTED' } })),
    });

    const request = new Request('http://localhost/api/subjects/subject-1/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_status', status: 'ARRIVED' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await workflowPost(request as never, { params: Promise.resolve({ id: 'subject-1' }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe('NOT_ASSIGNED_TO_SUBJECT');
  });

  it('Test 8.3 — Workflow API handles uppercase status values', async () => {
    createServerClientMock.mockReturnValue(makeServerClient());
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => chain({ data: { id: 'subject-1', assigned_technician_id: 'tech-1', status: 'ACCEPTED' } })),
    });
    updateJobStatusMock.mockResolvedValue({ ok: true, data: { id: 'subject-1', status: 'ARRIVED' } });

    const request = new Request('http://localhost/api/subjects/subject-1/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_status', status: 'ARRIVED' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await workflowPost(request as never, { params: Promise.resolve({ id: 'subject-1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(updateJobStatusMock).toHaveBeenCalledWith('subject-1', 'tech-1', 'ARRIVED');
  });

  it('Test 8.4 — Attendance toggle API is idempotent for same direction', async () => {
    createServerClientMock.mockReturnValue(makeServerClient());
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'attendance_logs') {
          return chain({
            data: {
              id: 'log-1',
              technician_id: 'tech-1',
              date: '2026-03-21',
              toggled_on_at: '2026-03-21T09:00:00.000Z',
              toggled_off_at: '2026-03-21T18:05:00.000Z',
              is_present: true,
            },
          });
        }
        return chain({ data: { id: 'tech-1' } });
      }),
    });

    const response = await attendanceTogglePost();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.message).toContain('already marked OFF');
  });

  it('Test 8.5 — Bill generation API prevents duplicate bills', async () => {
    createServerClientMock.mockReturnValue(makeServerClient());
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'subjects') {
          return chain({
            data: {
              id: 'subject-1',
              source_type: 'brand',
              assigned_technician_id: 'tech-1',
              status: 'IN_PROGRESS',
              brand_id: 'brand-1',
              dealer_id: null,
              is_warranty_service: false,
              is_amc_service: false,
              warranty_end_date: '2026-03-30',
              customer_name: 'Customer',
              service_charge_type: 'customer',
              brands: { name: 'Brand' },
              dealers: null,
            },
          });
        }
        if (table === 'subject_bills') {
          return chain({ data: { id: 'bill-1' } });
        }
        return chain({ data: null });
      }),
      rpc: vi.fn(),
    });

    const request = new Request('http://localhost/api/subjects/subject-1/billing', {
      method: 'POST',
      body: JSON.stringify({ action: 'generate_bill', visit_charge: 100, service_charge: 200 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await billingPost(request as never, { params: Promise.resolve({ id: 'subject-1' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('BILL_ALREADY_EXISTS');
  });

  it('Test 8.6 — All API routes return consistent error format', async () => {
    createServerClientMock.mockReturnValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: { message: 'Unauthorized' } })) },
      from: vi.fn(() => chain({ data: null })),
    });
    createAdminClientMock.mockReturnValue({ from: vi.fn(() => chain({ data: null })) });

    const workflowResponse = await workflowPost(
      new Request('http://localhost/api/subjects/subject-1/workflow', { method: 'POST', body: JSON.stringify({ action: 'update_status', status: 'ARRIVED' }), headers: { 'Content-Type': 'application/json' } }) as never,
      { params: Promise.resolve({ id: 'subject-1' }) },
    );
    const billingResponse = await billingPost(
      new Request('http://localhost/api/subjects/subject-1/billing', { method: 'POST', body: JSON.stringify({ action: 'generate_bill' }), headers: { 'Content-Type': 'application/json' } }) as never,
      { params: Promise.resolve({ id: 'subject-1' }) },
    );
    const attendanceResponse = await attendanceTogglePost();

    const workflowJson = await workflowResponse.json();
    const billingJson = await billingResponse.json();
    const attendanceJson = await attendanceResponse.json();

    for (const payload of [workflowJson, billingJson, attendanceJson]) {
      expect(payload).toMatchObject({ success: false, error: expect.any(String), code: expect.any(String) });
    }
  });
});