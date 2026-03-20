import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import {
  updateJobStatus,
  markJobIncomplete,
  uploadJobPhoto,
  getRequiredPhotos,
  checkCompletionRequirements,
  markJobComplete,
} from '@/modules/subjects/subject.job-workflow';
import type {
  JobCompletionRequirements,
  PhotoType,
  IncompleteJobInput,
} from '@/modules/subjects/subject.types';

export function useJobWorkflow(subjectId: string) {
  const { user } = useAuth();
  const technicianId = user?.id;
  const queryClient = useQueryClient();

  // Query: get required photos
  const requiredPhotosQuery = useQuery({
    queryKey: ['job-workflow', subjectId, 'required-photos'],
    queryFn: async () => {
      const result = await getRequiredPhotos(subjectId);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!subjectId,
  });

  // Query: check completion requirements
  const completionRequirementsQuery = useQuery({
    queryKey: ['job-workflow', subjectId, 'completion-requirements'],
    queryFn: async () => {
      const result = await checkCompletionRequirements(subjectId);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!subjectId,
    refetchInterval: 5000, // Poll every 5 seconds for real-time requirements
  });

  // Mutation: update job status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!technicianId) throw new Error('Not authenticated');
      const result = await updateJobStatus(subjectId, technicianId, newStatus);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.list });
      requiredPhotosQuery.refetch();
      completionRequirementsQuery.refetch();
      const labels: Record<string, string> = {
        ARRIVED: 'Marked as Arrived',
        IN_PROGRESS: 'Work Started',
        AWAITING_PARTS: 'Marked as Awaiting Parts',
      };
      toast.success(labels[newStatus] ?? 'Status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Mutation: upload photo with progress tracking
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, photoType }: { file: File; photoType: PhotoType }) => {
      if (!technicianId) throw new Error('Not authenticated');
      const result = await uploadJobPhoto(subjectId, technicianId, file, photoType);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (_, { photoType }) => {
      queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
      completionRequirementsQuery.refetch();
      toast.success(`${photoType.replace(/_/g, ' ')} uploaded`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Mutation: mark job incomplete
  const markIncompleteMutation = useMutation({
    mutationFn: async (input: IncompleteJobInput) => {
      if (!technicianId) throw new Error('Not authenticated');
      const result = await markJobIncomplete(subjectId, technicianId, input);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.list });
        toast.success('Job marked as incomplete');
      },
      onError: (err: Error) => toast.error(err.message),
  });

  // Mutation: mark job complete
  const markCompleteMutation = useMutation({
    mutationFn: async (notes?: string) => {
      if (!technicianId) throw new Error('Not authenticated');
      const result = await markJobComplete(subjectId, technicianId, notes);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(subjectId) });
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.list });
        toast.success('Job completed successfully');
      },
      onError: (err: Error) => toast.error(err.message),
  });

  return {
    requiredPhotos: requiredPhotosQuery.data ?? [],
    completionRequirements: completionRequirementsQuery.data as JobCompletionRequirements | undefined,
    isLoadingRequirements: requiredPhotosQuery.isLoading || completionRequirementsQuery.isLoading,

    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateStatusError: updateStatusMutation.error,

    uploadPhoto: uploadPhotoMutation.mutate,
    isUploadingPhoto: uploadPhotoMutation.isPending,
    uploadPhotoError: uploadPhotoMutation.error,

    markIncomplete: markIncompleteMutation.mutate,
    isMarkingIncomplete: markIncompleteMutation.isPending,
    markIncompleteError: markIncompleteMutation.error,

    markComplete: markCompleteMutation.mutate,
    isMarkingComplete: markCompleteMutation.isPending,
    markCompleteError: markCompleteMutation.error,
  };
}
