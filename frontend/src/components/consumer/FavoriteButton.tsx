'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAccount } from '../../context/AccountContext';
import { useI18n } from '../../hooks/useI18n';

interface FavoriteButtonProps {
  /** The id of the lot (`productId`). */
  productId?: string;
  /** The id of the **profile** of the cultivator (`farmerId`). */
  farmerId?: string;
  className?: string;
  /** The size of the icon. */
  size?: number;
}

/**
 * The heart that keeps a lot or a cultivator.
 *
 * The shared backend owns the state — the button asks it and believes
 * the answer. A request that fails leaves the heart as it was, because
 * the platform did not confirm the change.
 */
export default function FavoriteButton({
  productId,
  farmerId,
  className = '',
  size = 16,
}: FavoriteButtonProps) {
  const { t } = useI18n();
  const {
    canFavorite,
    favoriteProductIds,
    favoriteFarmerIds,
    toggleProduct,
    toggleFarmer,
  } = useAccount();
  const [busy, setBusy] = useState(false);

  const isFavorite = productId
    ? favoriteProductIds.includes(productId)
    : farmerId
      ? favoriteFarmerIds.includes(farmerId)
      : false;

  const label = isFavorite
    ? t('consumer.favorites.remove')
    : t('consumer.favorites.add');

  const handleClick = async () => {
    if (!canFavorite || busy) return;
    setBusy(true);
    try {
      if (productId) {
        await toggleProduct(productId);
      } else if (farmerId) {
        await toggleFarmer(farmerId);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!canFavorite) {
    // A visitor who is not a buyer of the platform cannot keep a lot.
    // The button is hidden rather than shown and refusing.
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={isFavorite}
      aria-label={label}
      title={label}
      className={`p-2 rounded-xl transition-colors active:scale-95 disabled:opacity-60 ${
        isFavorite
          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
          : 'bg-stone-100 text-stone-500 hover:text-rose-600 hover:bg-rose-50'
      } ${className}`}
    >
      <Heart
        style={{ width: size, height: size }}
        fill={isFavorite ? 'currentColor' : 'none'}
      />
    </button>
  );
}
