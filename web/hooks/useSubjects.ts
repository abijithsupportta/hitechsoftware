import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createSubjectTicket,
  getAssignableTechnicians,
  getProductsCatalog,
  getSubjects,
  lookupCustomerContextByPhone,
} from '@/modules/subjects/subject.service';
import { SUBJECT_DEFAULT_PAGE_SIZE, SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import type { SmartCreateSubjectInput } from '@/modules/subjects/subject.types';

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useSubjects() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      page,
      page_size: SUBJECT_DEFAULT_PAGE_SIZE,
    }),
    [debouncedSearch, page],
  );

  const query = useQuery({
    queryKey: [...SUBJECT_QUERY_KEYS.list, filters],
    queryFn: () => getSubjects(filters),
  });

  const createSubjectMutation = useMutation({
    mutationFn: (input: SmartCreateSubjectInput) => createSubjectTicket(input),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Ticket ${result.data.subject_number} created successfully`);
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  return {
    subjects: query.data?.ok ? query.data.data.data : [],
    pagination: query.data?.ok
      ? {
          page: query.data.data.page,
          pageSize: query.data.data.page_size,
          total: query.data.data.total,
          totalPages: query.data.data.total_pages,
        }
      : {
          page: 1,
          pageSize: SUBJECT_DEFAULT_PAGE_SIZE,
          total: 0,
          totalPages: 1,
        },
    searchInput,
    isLoading: query.isLoading,
    isCreating: createSubjectMutation.isPending,
    error:
      (query.data && !query.data.ok && query.data.error.message) ||
      (query.error instanceof Error ? query.error.message : null),
    createSubjectMutation,
    setSearch: (value: string) => {
      setSearchInput(value);
      setPage(1);
    },
    setPage: (value: number) => setPage(Math.max(1, value)),
  };
}

export function useSmartSubjectLookup(phoneNumber: string) {
  const normalized = phoneNumber.trim();

  const phoneLookupQuery = useQuery({
    queryKey: SUBJECT_QUERY_KEYS.phoneLookup(normalized),
    queryFn: () => lookupCustomerContextByPhone(normalized),
    enabled: normalized.length >= 10,
  });

  const techniciansQuery = useQuery({
    queryKey: SUBJECT_QUERY_KEYS.technicians,
    queryFn: getAssignableTechnicians,
    staleTime: 60 * 1000,
  });

  const productsQuery = useQuery({
    queryKey: SUBJECT_QUERY_KEYS.products,
    queryFn: getProductsCatalog,
    staleTime: 5 * 60 * 1000,
  });

  return {
    phoneLookup: phoneLookupQuery.data?.ok ? phoneLookupQuery.data.data : null,
    phoneLookupError:
      (phoneLookupQuery.data && !phoneLookupQuery.data.ok && phoneLookupQuery.data.error.message) ||
      (phoneLookupQuery.error instanceof Error ? phoneLookupQuery.error.message : null),
    isPhoneLookupLoading: phoneLookupQuery.isFetching,
    technicians: techniciansQuery.data?.ok ? techniciansQuery.data.data : [],
    techniciansError:
      (techniciansQuery.data && !techniciansQuery.data.ok && techniciansQuery.data.error.message) ||
      (techniciansQuery.error instanceof Error ? techniciansQuery.error.message : null),
    products: productsQuery.data?.ok ? productsQuery.data.data : [],
    productsError:
      (productsQuery.data && !productsQuery.data.ok && productsQuery.data.error.message) ||
      (productsQuery.error instanceof Error ? productsQuery.error.message : null),
    isReferenceLoading: techniciansQuery.isLoading || productsQuery.isLoading,
  };
}
