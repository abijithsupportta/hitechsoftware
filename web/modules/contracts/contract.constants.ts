export const CONTRACT_QUERY_KEYS = {
  bySubject: (subjectId: string) => ['subject-contracts', subjectId] as const,
};
