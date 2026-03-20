'use client';

import React, { useRef } from 'react';
import { CheckCircle2, Upload, Video } from 'lucide-react';
import type { PhotoType } from '@/modules/subjects/subject.types';

const ALLOWED_TYPES: Record<string, string> = {
  service_video: 'video/mp4,video/quicktime',
};

const MAX_SIZES: Record<string, number> = {
  service_video: 50 * 1024 * 1024,
};

const DEFAULT_MAX_SIZE = 2 * 1024 * 1024;

interface PhotoUploadRowProps {
  photoType: PhotoType;
  label: string;
  isRequired: boolean;
  isUploaded: boolean;
  uploadedUrl?: string;
  subjectId: string;
  onUploadSuccess: (file: File) => void;
  isUploading: boolean;
}

export function PhotoUploadRow({
  photoType,
  label,
  isRequired,
  isUploaded,
  uploadedUrl,
  onUploadSuccess,
  isUploading,
}: PhotoUploadRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isVideo = photoType === 'service_video';
  const accept = ALLOWED_TYPES[photoType] ?? 'image/jpeg,image/png,image/webp';
  const maxBytes = MAX_SIZES[photoType] ?? DEFAULT_MAX_SIZE;

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES[photoType] && !file.type.startsWith('image/')) {
      alert('Only image files allowed for this type (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > maxBytes) {
      const mb = maxBytes / (1024 * 1024);
      alert(`File too large. Maximum ${mb}MB allowed for this type.`);
      return;
    }
    onUploadSuccess(file);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex-shrink-0">
        {isVideo ? (
          <Video className="h-5 w-5 text-slate-500" />
        ) : (
          <div className="h-5 w-5 rounded bg-slate-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">{label}</span>
          {isRequired && (
            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
              Required
            </span>
          )}
        </div>
        {isUploaded && uploadedUrl && !isVideo && (
          <img
            src={uploadedUrl}
            alt={label}
            className="mt-1 h-10 w-10 rounded object-cover"
          />
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {isUploaded && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {isUploading ? 'Uploading…' : isUploaded ? 'Replace' : 'Upload'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) handleFile(file);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
