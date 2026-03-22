import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/with-auth';
import {
  getRequiredPhotos,
  checkCompletionRequirements,
  updateJobStatus,
  markJobIncomplete,
  markJobComplete,
} from '@/modules/subjects/subject.job-workflow';
import type { IncompleteJobInput, IncompleteReason } from '@/modules/subjects/subject.types';

const isDev = process.env.NODE_ENV === 'development';

// Structured error response format
interface ErrorResponse {
  step: string;
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, unknown>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: subjectId } = await params;
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ✓ Workflow API: Loading requirements for subject ${subjectId}`);

  if (!subjectId || typeof subjectId !== 'string' || subjectId.trim() === '') {
    const error: ErrorResponse = {
      step: '1. Validate Subject ID',
      code: 'INVALID_SUBJECT_ID',
      message: 'Subject ID is required and must be a non-empty string',
      userMessage: 'Invalid subject ID format',
    };
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  const auth = await requireAuth(_request);
  if (!auth.ok) return auth.response;
  const { userId, role: userRole, admin } = auth;
  const subjectCheckResult = await admin
    .from('subjects')
    .select('id,assigned_technician_id')
    .eq('id', subjectId)
    .eq('is_deleted', false)
    .maybeSingle<{ id: string; assigned_technician_id: string | null }>();

  if (subjectCheckResult.error) {
    const error: ErrorResponse = {
      step: '4. Load Subject',
      code: 'SUBJECT_QUERY_ERROR',
      message: subjectCheckResult.error.message,
      userMessage: 'Failed to load subject details. Please try again.',
      details: isDev ? { dbError: subjectCheckResult.error.message } : undefined,
    };
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  if (!subjectCheckResult.data) {
    const error: ErrorResponse = {
      step: '4. Load Subject',
      code: 'SUBJECT_NOT_FOUND',
      message: `No active subject found with ID ${subjectId}`,
      userMessage: 'This subject could not be found.',
      details: isDev ? { subjectId } : undefined,
    };
    return NextResponse.json({ ok: false, error }, { status: 404 });
  }

  if (
    userRole === 'technician'
    && subjectCheckResult.data.assigned_technician_id !== userId
  ) {
    const error: ErrorResponse = {
      step: '4. Verify Technician Assignment',
      code: 'NOT_ASSIGNED_TO_SUBJECT',
      message: `Subject is assigned to technician ${subjectCheckResult.data.assigned_technician_id}, not ${userId}`,
      userMessage: 'You are not assigned to this subject.',
      details: isDev ? { assignedTo: subjectCheckResult.data.assigned_technician_id, requestedBy: userId } : undefined,
    };
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const [requiredPhotosResult, completionRequirementsResult] = await Promise.all([
    getRequiredPhotos(subjectId),
    checkCompletionRequirements(subjectId),
  ]);

  if (!requiredPhotosResult.ok) {
    const error: ErrorResponse = {
      step: '5. Load Required Photos',
      code: 'REQUIRED_PHOTOS_LOAD_FAILED',
      message: requiredPhotosResult.error.message,
      userMessage: requiredPhotosResult.error.message,
    };
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  if (!completionRequirementsResult.ok) {
    const error: ErrorResponse = {
      step: '5. Load Completion Requirements',
      code: 'COMPLETION_REQUIREMENTS_LOAD_FAILED',
      message: completionRequirementsResult.error.message,
      userMessage: completionRequirementsResult.error.message,
    };
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      requiredPhotos: requiredPhotosResult.data,
      completionRequirements: completionRequirementsResult.data,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: subjectId } = await params;
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ✓ Workflow API: Starting job status mutation for subject ${subjectId}`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Validate subject ID
  // ──────────────────────────────────────────────────────────────────────────
  if (!subjectId || typeof subjectId !== 'string' || subjectId.trim() === '') {
    const error: ErrorResponse = {
      step: '1. Validate Subject ID',
      code: 'INVALID_SUBJECT_ID',
      message: 'Subject ID is required and must be a non-empty string',
      userMessage: 'Invalid subject ID format',
    };
    console.log(`[${timestamp}] ✗ Step 1 failed:`, error.code);
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: Get authenticated user
  // ──────────────────────────────────────────────────────────────────────────
  const auth = await requireAuth(request, { roles: ['technician'] });
  if (!auth.ok) {
    console.log(`[${timestamp}] ✗ Auth failed`);
    return auth.response;
  }
  const { userId, admin } = auth;
  console.log(`[${timestamp}] ✓ Auth passed: User ${userId} authenticated as technician`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: Parse request body
  // ──────────────────────────────────────────────────────────────────────────
  let body: {
    action?: string;
    status?: string;
    reason?: string;
    note?: string;
    sparePartsRequested?: string;
    sparePartsQuantity?: number;
    sparePartsItems?: Array<{ name: string; quantity: number; price: number }>;
    rescheduledDate?: string;
    notes?: string;
  };

  try {
    body = await request.json();
  } catch (parseErr) {
    const error: ErrorResponse = {
      step: '4. Parse Request Body',
      code: 'INVALID_JSON',
      message: parseErr instanceof Error ? parseErr.message : 'Invalid JSON body',
      userMessage: 'Request body must be valid JSON',
      details: isDev ? { error: parseErr instanceof Error ? parseErr.message : 'Unknown' } : undefined,
    };
    console.log(`[${timestamp}] ✗ Step 4 failed:`, error.code);
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  console.log(`[${timestamp}] ✓ Step 4 passed: Request parsed`);

  const { action } = body;

  // ──────────────────────────────────────────────────────────────────────────
  // Step 5: Validate action & required fields
  // ──────────────────────────────────────────────────────────────────────────
  if (!action) {
    const error: ErrorResponse = {
      step: '5. Validate Action',
      code: 'MISSING_ACTION',
      message: 'action field is required',
      userMessage: 'Request must specify which action to perform',
    };
    console.log(`[${timestamp}] ✗ Step 5 failed:`, error.code);
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  console.log(`[${timestamp}] ✓ Step 5 passed: Action=${action}`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 6: Verify subject exists and technician is assigned
  // ──────────────────────────────────────────────────────────────────────────
  const subjectCheckResult = await admin
    .from('subjects')
    .select('id,assigned_technician_id,status')
    .eq('id', subjectId)
    .eq('is_deleted', false)
    .maybeSingle<{ id: string; assigned_technician_id: string | null; status: string }>();

  if (subjectCheckResult.error) {
    const error: ErrorResponse = {
      step: '6. Load Subject',
      code: 'SUBJECT_QUERY_ERROR',
      message: subjectCheckResult.error.message,
      userMessage: 'Failed to load subject details. Please try again.',
      details: isDev ? { dbError: subjectCheckResult.error.message } : undefined,
    };
    console.log(`[${timestamp}] ✗ Step 6 failed:`, error.code);
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  if (!subjectCheckResult.data) {
    const error: ErrorResponse = {
      step: '6. Load Subject',
      code: 'SUBJECT_NOT_FOUND',
      message: `No active subject found with ID ${subjectId}`,
      userMessage: 'This subject could not be found. It may have been deleted or the ID is incorrect.',
      details: isDev ? { subjectId } : undefined,
    };
    console.log(`[${timestamp}] ✗ Step 6 failed:`, error.code);
    return NextResponse.json({ ok: false, error }, { status: 404 });
  }

  const subject = subjectCheckResult.data;

  if (!subject.assigned_technician_id) {
    const error: ErrorResponse = {
      step: '6. Verify Assignment',
      code: 'SUBJECT_NOT_ASSIGNED',
      message: 'No technician is assigned to this subject',
      userMessage: 'This subject has not been assigned to any technician yet',
      details: isDev ? { subjectStatus: subject.status } : undefined,
    };
    console.log(`[${timestamp}] ✗ Step 6 failed:`, error.code);
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  if (subject.assigned_technician_id !== userId) {
    const error: ErrorResponse = {
      step: '6. Verify Technician Assignment',
      code: 'NOT_ASSIGNED_TO_SUBJECT',
      message: `Subject is assigned to technician ${subject.assigned_technician_id}, not ${userId}`,
      userMessage: 'You are not assigned to this subject. You can only update subjects assigned to you.',
      details: isDev ? { assignedTo: subject.assigned_technician_id, requestedBy: userId } : undefined,
    };
    console.log(`[${timestamp}] ✗ Step 6 failed:`, error.code);
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  console.log(`[${timestamp}] ✓ Step 6 passed: Subject ${subjectId} is assigned to technician`);

  // ──────────────────────────────────────────────────────────────────────────
  // Action: update_status
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'update_status') {
    const { status } = body;
    if (!status) {
      const error: ErrorResponse = {
        step: '7. Process: update_status',
        code: 'MISSING_STATUS',
        message: 'status field is required for update_status action',
        userMessage: 'You must specify the new status (ARRIVED, IN_PROGRESS, AWAITING_PARTS)',
      };
      console.log(`[${timestamp}] ✗ Step 7 failed:`, error.code);
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    console.log(`[${timestamp}] ⊘ Processing: update_status to '${status}'`);
    const result = await updateJobStatus(subjectId, userId, status);

    if (!result.ok) {
      const workflowError = result.error as ErrorResponse | { message: string };
      const error: ErrorResponse = {
        step: '7. Update Job Status',
        code: 'WORKFLOW_UPDATE_FAILED',
        message: 'message' in workflowError ? workflowError.message : 'Unknown workflow error',
        userMessage:
          'message' in workflowError ? workflowError.message : 'Failed to update job status',
        details: isDev ? workflowError : undefined,
      };
      console.log(`[${timestamp}] ✗ Step 7 failed:`, error.code, '-', error.message);
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    console.log(`[${timestamp}] ✓✓✓ Workflow complete: Job marked as '${status}'`);
    return NextResponse.json({ ok: true, data: result.data });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Action: mark_incomplete
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'mark_incomplete') {
    const input: IncompleteJobInput = {
      reason: (body.reason ?? '') as IncompleteReason,
      note: body.note ?? '',
      sparePartsRequested: body.sparePartsRequested,
      sparePartsQuantity: body.sparePartsQuantity,
      sparePartsItems: body.sparePartsItems,
      rescheduledDate: body.rescheduledDate,
    };

    console.log(`[${timestamp}] ⊘ Processing: mark_incomplete with reason '${input.reason}'`);
    const result = await markJobIncomplete(subjectId, userId, input);

    if (!result.ok) {
      const workflowError = result.error as ErrorResponse | { message: string };
      const error: ErrorResponse = {
        step: '7. Mark Job Incomplete',
        code: 'MARK_INCOMPLETE_FAILED',
        message: 'message' in workflowError ? workflowError.message : 'Unknown workflow error',
        userMessage:
          'message' in workflowError ? workflowError.message : 'Failed to mark job incomplete',
        details: isDev ? workflowError : undefined,
      };
      console.log(`[${timestamp}] ✗ Step 7 failed:`, error.code, '-', error.message);
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    console.log(`[${timestamp}] ✓✓✓ Workflow complete: Job marked as incomplete`);
    return NextResponse.json({ ok: true, data: result.data });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Action: mark_complete
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'mark_complete') {
    console.log(`[${timestamp}] ⊘ Processing: mark_complete`);
    const result = await markJobComplete(subjectId, userId, body.notes);

    if (!result.ok) {
      const workflowError = result.error as ErrorResponse | { message: string };
      const error: ErrorResponse = {
        step: '7. Mark Job Complete',
        code: 'MARK_COMPLETE_FAILED',
        message: 'message' in workflowError ? workflowError.message : 'Unknown workflow error',
        userMessage:
          'message' in workflowError ? workflowError.message : 'Failed to mark job complete',
        details: isDev ? workflowError : undefined,
      };
      console.log(`[${timestamp}] ✗ Step 7 failed:`, error.code, '-', error.message);
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    console.log(`[${timestamp}] ✓✓✓ Workflow complete: Job marked as complete`);
    return NextResponse.json({ ok: true, data: result.data });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Unknown action
  // ──────────────────────────────────────────────────────────────────────────
  const error: ErrorResponse = {
    step: '5. Validate Action',
    code: 'UNKNOWN_ACTION',
    message: `Unknown action: '${action}'`,
    userMessage: `Action '${action}' is not supported. Use: update_status, mark_incomplete, or mark_complete`,
    details: isDev ? { actionReceived: action } : undefined,
  };
  console.log(`[${timestamp}] ✗ Validation failed:`, error.code);
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
