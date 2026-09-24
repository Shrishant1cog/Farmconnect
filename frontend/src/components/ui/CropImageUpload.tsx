'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, Link as LinkIcon, CheckCircle2, AlertCircle } from 'lucide-react';

interface CropImageUploadProps {
  value: string;
  onChange: (imageUrl: string) => void;
}

export default function CropImageUpload({ value, onChange }: CropImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [useUrlInput, setUseUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = (file: File) => {
    setError(null);

    // Support all standard & modern raster/vector image MIME types
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WEBP, AVIF, SVG, GIF).');
      return;
    }

    // 8MB Client-side limit safeguard
    if (file.size > 8 * 1024 * 1024) {
      setError('Image size exceeds 8MB. Please select a lighter image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange(result);
      }
    };
    reader.onerror = () => {
      setError('Could not process this image format. Try another image or use a web link.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const applyUrl = () => {
    if (!urlDraft.trim()) return;
    onChange(urlDraft.trim());
    setUrlDraft('');
    setUseUrlInput(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
          Harvest / Crop Photograph
        </label>
        <button
          type="button"
          onClick={() => {
            setUseUrlInput(!useUrlInput);
            setError(null);
          }}
          className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors"
        >
          <LinkIcon className="w-3 h-3" />
          {useUrlInput ? 'Upload from Device' : 'Paste Web URL'}
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Preview State */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-stone-100 group aspect-video sm:h-52 w-full">
          <img
            src={value}
            alt="Crop Harvest Preview"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-white text-stone-900 rounded-xl text-xs font-bold shadow-md hover:bg-stone-100 transition-all"
            >
              Replace Image
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-2 bg-red-600 text-white rounded-xl shadow-md hover:bg-red-700 transition-all"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <span className="absolute bottom-2 left-2 bg-emerald-900/80 backdrop-blur-md text-emerald-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Ready for Listing
          </span>
        </div>
      ) : useUrlInput ? (
        /* Image URL Input Form */
        <div className="flex gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://images.unsplash.com/... or cloud link"
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
          />
          <button
            type="button"
            onClick={applyUrl}
            disabled={!urlDraft.trim()}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            Attach
          </button>
        </div>
      ) : (
        /* Drag & Drop Upload Zone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50/70 scale-[1.01]'
              : 'border-stone-300 bg-white/80 hover:border-emerald-500 hover:bg-emerald-50/30'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-800">
              Click to browse or drag & drop harvest photo
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Supports all formats: PNG, JPG, WEBP, AVIF, SVG, GIF (Up to 8MB)
            </p>
          </div>
        </div>
      )}

      {/* Hidden Native File Input accepting all image types */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}