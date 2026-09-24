'use client';

import React, { useState } from 'react';

// Default high-resolution fallback photos categorized by crop type
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  GRAINS: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
  MILLETS: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
  VEGETABLES: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80',
  FRUITS: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  SPICES: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  ORGANIC: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
};

export function getCategoryFallback(categoryName?: string, isOrganic?: boolean): string {
  if (isOrganic) return CATEGORY_FALLBACK_IMAGES.ORGANIC;
  if (!categoryName) return CATEGORY_FALLBACK_IMAGES.DEFAULT;

  const normalized = categoryName.toUpperCase();
  for (const [key, url] of Object.entries(CATEGORY_FALLBACK_IMAGES)) {
    if (normalized.includes(key)) return url;
  }
  return CATEGORY_FALLBACK_IMAGES.DEFAULT;
}

interface SafeCropImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  categoryName?: string;
  isOrganic?: boolean;
  alt: string;
}

export default function SafeCropImage({
  src,
  categoryName,
  isOrganic,
  alt,
  className,
  ...props
}: SafeCropImageProps) {
  const fallbackUrl = getCategoryFallback(categoryName, isOrganic);
  const [imgSrc, setImgSrc] = useState<string>(src && src.trim() !== '' ? src : fallbackUrl);
  const [hasError, setHasError] = useState(false);

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallbackUrl);
        }
      }}
    />
  );
}