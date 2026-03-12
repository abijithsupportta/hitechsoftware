export const SUBJECT_QUERY_KEYS = {
  all: ['subjects'] as const,
  list: ['subjects', 'list'] as const,
  detail: (id: string) => ['subjects', 'detail', id] as const,
  phoneLookup: (phoneNumber: string) => ['subjects', 'phone-lookup', phoneNumber] as const,
  technicians: ['subjects', 'technicians'] as const,
  products: ['subjects', 'products'] as const,
};

export const SUBJECT_DEFAULT_PAGE_SIZE = 10;

export const SUBJECT_PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
] as const;

export const SUBJECT_JOB_TYPE_OPTIONS = [
  { label: 'In Warranty', value: 'IN_WARRANTY' },
  { label: 'Out of Warranty', value: 'OUT_OF_WARRANTY' },
  { label: 'AMC', value: 'AMC' },
] as const;
