import { createClient } from '@/lib/supabase/client';
import type { PhotoType, SubjectPhoto } from '@/modules/subjects/subject.types';

const supabase = createClient();

const STORAGE_BUCKET = 'subject-photos';

export async function uploadPhoto(
  subjectId: string,
  photoType: PhotoType,
  file: File,
) {
  const timestamp = Date.now();
  const fileName = `${photoType}_${timestamp}_${Math.random().toString(36).slice(2, 9)}`;
  const path = `${subjectId}/${fileName}`;

  // Upload to storage
  const uploadResult = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadResult.error) {
    throw new Error(`Storage upload failed: ${uploadResult.error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  const publicUrl = publicUrlData?.publicUrl ?? '';

  // Save metadata to database
  const dbResult = await supabase
    .from('subject_photos')
    .insert({
      subject_id: subjectId,
      photo_type: photoType,
      storage_path: path,
      public_url: publicUrl,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      file_size_bytes: file.size,
      mime_type: file.type,
    })
    .select('id,photo_type,storage_path,public_url,uploaded_by,uploaded_at,file_size_bytes,mime_type')
    .single<SubjectPhoto>();

  if (dbResult.error) {
    // Attempt cleanup of uploaded file
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    throw new Error(`Failed to save photo metadata: ${dbResult.error.message}`);
  }

  return dbResult.data;
}

export async function findBySubjectId(subjectId: string) {
  return supabase
    .from('subject_photos')
    .select('id,subject_id,photo_type,storage_path,public_url,uploaded_by,uploaded_at,file_size_bytes,mime_type')
    .eq('subject_id', subjectId)
    .eq('is_deleted', false)
    .order('uploaded_at', { ascending: false });
}

export async function findBySubjectAndType(subjectId: string, photoType: PhotoType) {
  return supabase
    .from('subject_photos')
    .select('id,subject_id,photo_type,storage_path,public_url,uploaded_by,uploaded_at,file_size_bytes,mime_type')
    .eq('subject_id', subjectId)
    .eq('photo_type', photoType)
    .eq('is_deleted', false)
    .maybeSingle<SubjectPhoto>();
}

export async function deletePhoto(photoId: string, storagePath: string) {
  // Soft delete in database
  const dbResult = await supabase
    .from('subject_photos')
    .update({ is_deleted: true })
    .eq('id', photoId)
    .select('id')
    .single();

  if (dbResult.error) {
    throw new Error(`Failed to delete photo: ${dbResult.error.message}`);
  }

  // Delete from storage
  const storageResult = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (storageResult.error) {
    console.warn(`Failed to delete storage file ${storagePath}:`, storageResult.error);
  }

  return dbResult.data;
}

export async function findById(photoId: string) {
  return supabase
    .from('subject_photos')
    .select('id,subject_id,photo_type,storage_path,public_url,uploaded_by,uploaded_at,file_size_bytes,mime_type')
    .eq('id', photoId)
    .eq('is_deleted', false)
    .maybeSingle<SubjectPhoto>();
}

// ---------------------------------------------------------------------------
// Separate storage upload / DB record helpers (used by photo service layer)
// ---------------------------------------------------------------------------

/** Upload file to Supabase Storage only — does NOT write a DB record. */
export async function uploadToStorage(
  subjectId: string,
  photoType: PhotoType,
  file: File,
): Promise<{ storagePath: string; publicUrl: string }> {
  const timestamp = Date.now();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${subjectId}/${photoType}_${timestamp}.${ext}`;

  const uploadResult = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadResult.error) {
    throw new Error(`Storage upload failed: ${uploadResult.error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  return {
    storagePath: path,
    publicUrl: publicUrlData?.publicUrl ?? '',
  };
}

/** Insert a photo metadata record into subject_photos. */
export async function savePhotoRecord(data: {
  subjectId: string;
  photoType: PhotoType;
  storagePath: string;
  publicUrl: string;
  uploadedBy: string | null;
  fileSizeBytes: number;
  mimeType: string;
}) {
  return supabase
    .from('subject_photos')
    .insert({
      subject_id: data.subjectId,
      photo_type: data.photoType,
      storage_path: data.storagePath,
      public_url: data.publicUrl,
      uploaded_by: data.uploadedBy,
      file_size_bytes: data.fileSizeBytes,
      mime_type: data.mimeType,
    })
    .select('id,subject_id,photo_type,storage_path,public_url,uploaded_by,uploaded_at,file_size_bytes,mime_type')
    .single<SubjectPhoto>();
}

/** Alias: find all photos for a subject (spec name). */
export const findPhotosBySubjectId = findBySubjectId;

/** Alias: find single photo by subject + type (spec name). */
export const findPhotoByType = findBySubjectAndType;
