export const ATTENDANCE_QUERY_KEYS = {
  all: ['attendance'] as const,
  today: (technicianId: string) => ['attendance', 'today', technicianId] as const,
  summary: (technicianId: string, month: number, year: number) => ['attendance', 'summary', technicianId, month, year] as const,
  allTechnicianStatus: ['attendance', 'all-technician-status'] as const,
};
