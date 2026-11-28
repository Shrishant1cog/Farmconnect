'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Edit3, AlertCircle, Search } from 'lucide-react';
import CropImageUpload from '../ui/CropImageUpload';
import { fetchApi } from '../../lib/api';
import { localizedName, LocalizedName } from '../../lib/localized';
import { useI18n } from '../../hooks/useI18n';

interface EditCropModalProps {
  crop: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

interface CatalogCrop extends LocalizedName {
  name: string;
  category?: string;
  aliases?: string[];
}

interface CatalogCategory {
  id: string;
  name: string;
  slug?: string;
}

const CATEGORY_KEY_BY_SLUG: Record<string, string> = {
  vegetables: 'farmer.category.vegetables',
  fruits: 'farmer.category.fruits',
  grains: 'farmer.category.grainsMillets',
  'grains-millets': 'farmer.category.grainsMillets',
  spices: 'farmer.category.spicesHerbs',
  'spices-herbs': 'farmer.category.spicesHerbs',
  pulses: 'farmer.category.pulsesLegumes',
  'pulses-legumes': 'farmer.category.pulsesLegumes',
  oilseeds: 'farmer.category.oilseeds',
  'plantation-crops': 'farmer.category.plantationCrops',
  'cash-crops': 'farmer.category.cashCrops',
  'flowers-floriculture': 'farmer.category.flowersFloriculture',
  'nuts-dry-produce': 'farmer.category.nutsDryProduce',
};

function categoryTranslationKey(category: CatalogCategory): string {
  const slug = (category.slug || '').trim().toLowerCase();
  if (CATEGORY_KEY_BY_SLUG[slug]) return CATEGORY_KEY_BY_SLUG[slug];

  const name = (category.name || '').toLowerCase();
  if (name.includes('grain') || name.includes('millet')) return 'farmer.category.grainsMillets';
  if (name.includes('spice') && name.includes('cash')) return 'farmer.category.spicesCashCrops';
  if (name.includes('spice') || name.includes('herb')) return 'farmer.category.spicesHerbs';
  if (name.includes('pulse') || name.includes('legume')) return 'farmer.category.pulsesLegumes';
  if (name.includes('oilseed')) return 'farmer.category.oilseeds';
  if (name.includes('plantation')) return 'farmer.category.plantationCrops';
  if (name.includes('cash')) return 'farmer.category.cashCrops';
  if (name.includes('flower') || name.includes('floriculture')) return 'farmer.category.flowersFloriculture';
  if (name.includes('nut') || name.includes('dry')) return 'farmer.category.nutsDryProduce';
  if (name.includes('vegetable')) return 'farmer.category.vegetables';
  if (name.includes('fruit')) return 'farmer.category.fruits';
  return 'farmer.category.other';
}

function categoryMatchesCrop(category: CatalogCategory, cropCategory?: string): boolean {
  const target = (cropCategory || '').toLowerCase();
  const slug = (category.slug || '').toLowerCase();
  const name = (category.name || '').toLowerCase();

  if (!target) return false;
  if (target === slug) return true;
  if (target === 'grains-millets' && (slug === 'grains' || name.includes('grain'))) return true;
  if (target === 'spices-herbs' && (slug === 'spices' || name.includes('spice'))) return true;
  if (target === 'cash-crops' && name.includes('cash')) return true;
  if (target === 'pulses-legumes' && (slug === 'pulses' || name.includes('pulse'))) return true;
  return name.includes(target.replaceAll('-', ' '));
}

export default function EditCropModal({ crop, isOpen, onClose, onSuccess }: EditCropModalProps) {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSearch, setCropSearch] = useState('');
  const [cropResults, setCropResults] = useState<CatalogCrop[]>([]);
  const [cropSearchLoading, setCropSearchLoading] = useState(false);
  const [cropSearchError, setCropSearchError] = useState<string | null>(null);
  const [selectedCropName, setSelectedCropName] = useState('');
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cropName: '',
    variety: '',
    categoryId: '',
    description: '',
    farmerPrice: '',
    priceUnit: 'PER_KG',
    quantityAvailable: '',
    quantityUnit: 'KG',
    minOrderKg: '25',
    isOrganic: false,
    imageUrl: '',
  });

  // Synchronize form values whenever a different crop is selected or the modal is opened
  useEffect(() => {
    if (crop && isOpen) {
      const cropName = crop.cropName || crop.title || '';
      setFormData({
        cropName,
        variety: crop.variety || '',
        categoryId: crop.categoryId || crop.category?.id || '',
        description: crop.description || '',
        farmerPrice: crop.farmerPrice?.toString() || '',
        priceUnit: crop.priceUnit || 'PER_KG',
        quantityAvailable: crop.quantityAvailable?.toString() || '',
        quantityUnit: crop.quantityUnit || 'KG',
        minOrderKg: crop.minOrderKg?.toString() || '25',
        isOrganic: Boolean(crop.isOrganic),
        imageUrl: crop.imageUrl || '',
      });
      setSelectedCropName(cropName);
      setError(null);
    }
  }, [crop, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCropSearchLoading(true);
      setCropSearchError(null);
      try {
        const query = cropSearch.trim()
          ? `?search=${encodeURIComponent(cropSearch.trim())}`
          : '';
        const response = await fetchApi(`/catalog/crops${query}`);
        const results = response?.data || response?.crops || (Array.isArray(response) ? response : []);
        if (!cancelled && Array.isArray(results)) {
          setCropResults(results);
        }
      } catch {
        if (!cancelled) setCropSearchError(t('farmer.cropPicker.error'));
      } finally {
        if (!cancelled) setCropSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cropSearch, isOpen, t]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);
    fetchApi('/catalog/categories')
      .then((response) => {
        const data = response?.data || response?.categories || (Array.isArray(response) ? response : []);
        if (!cancelled && Array.isArray(data)) {
          setCategories(data);
          setFormData((current) => {
            if (current.categoryId || data.length === 0) return current;
            return { ...current, categoryId: data[0].id };
          });
        }
      })
      .catch(() => {
        if (!cancelled) setCategoriesError(t('farmer.cropPicker.categoriesError'));
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, t]);

  if (!isOpen || !crop) return null;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const selectCrop = (catalogCrop: CatalogCrop) => {
    const matchingCategory = categories.find((category) => categoryMatchesCrop(category, catalogCrop.category));
    setSelectedCropName(catalogCrop.name);
    setFormData((current) => ({
      ...current,
      cropName: catalogCrop.name,
      categoryId: matchingCategory?.id || current.categoryId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const priceNum = parseFloat(formData.farmerPrice);
    const quantityNum = parseFloat(formData.quantityAvailable);

    if (!formData.cropName.trim()) {
      setError(t('farmer.cropModal.titleRequired'));
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError(t('farmer.cropModal.priceRequired'));
      return;
    }

    if (isNaN(quantityNum) || quantityNum < 0) {
      setError(t('farmer.cropModal.stockRequired'));
      return;
    }

    setLoading(true);

    try {
      // 1. Resolve auth token safely across both storage conventions
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token')
          : null;

      const payload = {
        title: formData.cropName.trim(),
        cropName: formData.cropName.trim(),
        variety: formData.variety.trim(),
        categoryId: formData.categoryId,
        description: formData.description.trim(),
        farmerPrice: priceNum,
        priceUnit: formData.priceUnit,
        quantityAvailable: quantityNum,
        quantityUnit: formData.quantityUnit,
        minOrderKg: parseFloat(formData.minOrderKg) || 10,
        isOrganic: Boolean(formData.isOrganic),
        imageUrl: formData.imageUrl || '',
      };

      // 2. Perform the update through the centralized `fetchApi`, which
      //    resolves the shared backend and attaches the bearer token. A
      //    failed request throws — a second, direct `fetch` used to
      //    swallow the HTTP status and hand the error body to the code
      //    below as if it were an updated listing.
      const json: any = await fetchApi(`/products/${crop.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (json?.success || json?.id || json?.data) {
        const updatedData = {
          ...crop,
          ...payload,
          ...(json?.data || json?.product || {}),
          id: crop.id,
        };
        onSuccess(updatedData);
        onClose();
      } else {
        setError(t('farmer.cropModal.updateFailed'));
      }
    } catch (err: any) {
      console.error('Update crop failure:', err);
      setError(t('farmer.cropModal.networkUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">{t('farmer.cropModal.editTitle')}</h2>
              <p className="text-xs text-stone-500">{t('farmer.cropModal.editSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Universal Image Uploader Field */}
          <CropImageUpload
            value={formData.imageUrl}
            onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
          />

          {/* Searchable crop catalogue */}
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div>
              <h3 className="text-xs font-black uppercase text-emerald-950">{t('farmer.cropPicker.heading')}</h3>
              <p className="text-[11px] text-stone-500 mt-1">{t('farmer.cropPicker.hint')}</p>
            </div>

            <label className="block">
              <span className="sr-only">{t('farmer.cropPicker.searchLabel')}</span>
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={cropSearch}
                  onChange={(event) => setCropSearch(event.target.value)}
                  placeholder={t('farmer.cropPicker.searchPlaceholder')}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
            </label>

            {cropSearchLoading && (
              <p className="flex items-center gap-2 text-[11px] font-bold text-emerald-800">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('farmer.cropPicker.loading')}
              </p>
            )}

            {cropSearchError && (
              <p className="text-[11px] font-semibold text-red-700">{cropSearchError}</p>
            )}

            {!cropSearchLoading && !cropSearchError && cropResults.length === 0 && (
              <p className="text-[11px] text-stone-500">{t('farmer.cropPicker.noMatches')}</p>
            )}

            {cropResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-emerald-100 bg-white divide-y divide-stone-100">
                {cropResults.map((catalogCrop) => (
                  <button
                    key={`${catalogCrop.name}-${catalogCrop.category || ''}`}
                    type="button"
                    onClick={() => selectCrop(catalogCrop)}
                    className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors hover:bg-emerald-50 ${
                      selectedCropName === catalogCrop.name ? 'bg-emerald-50 text-emerald-900' : 'text-stone-700'
                    }`}
                  >
                    <span>{localizedName(catalogCrop, locale)}</span>
                    {localizedName(catalogCrop, locale) !== catalogCrop.name && (
                      <span className="ml-2 text-[10px] font-semibold text-stone-400">
                        {catalogCrop.name}
                      </span>
                    )}
                    {selectedCropName === catalogCrop.name && (
                      <span className="ml-2 text-[10px] font-black text-emerald-700">{t('farmer.cropPicker.selected')}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Free-text crop name and variety */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
                {t('farmer.cropModal.cropName')}
              </label>
              <input
                type="text"
                required
                placeholder={t('farmer.cropModal.cropNamePlaceholder')}
                value={formData.cropName}
                onChange={(e) => {
                  setSelectedCropName('');
                  setFormData((prev) => ({ ...prev, cropName: e.target.value }));
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
                {t('farmer.cropModal.variety')}
              </label>
              <input
                type="text"
                placeholder={t('farmer.cropModal.varietyPlaceholder')}
                value={formData.variety}
                onChange={(e) => setFormData((prev) => ({ ...prev, variety: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          {/* Listing category */}
          <div>
            <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
              {t('farmer.cropPicker.category')}
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
              disabled={categoriesLoading || categories.length === 0}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white disabled:bg-stone-100"
            >
              <option value="">{t('farmer.cropPicker.categoryPlaceholder')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {t(categoryTranslationKey(category))}
                </option>
              ))}
            </select>
            {categoriesLoading && (
              <p className="mt-1 text-[10px] font-bold text-stone-500">{t('farmer.cropPicker.categoriesLoading')}</p>
            )}
            {categoriesError && (
              <p className="mt-1 text-[10px] font-bold text-red-700">{categoriesError}</p>
            )}
          </div>

          {/* Harvest Description */}
          <div>
            <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
              {t('farmer.cropModal.description')}
            </label>
            <textarea
              rows={2}
              placeholder={t('farmer.cropModal.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none resize-none"
            />
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
                {t('farmer.cropModal.farmerPrice')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="₹"
                value={formData.farmerPrice}
                onChange={(e) => setFormData((prev) => ({ ...prev, farmerPrice: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">{t('farmer.cropModal.priceUnit')}</label>
              <select
                value={formData.priceUnit}
                onChange={(e) => setFormData((prev) => ({ ...prev, priceUnit: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="PER_KG">{t('farmer.cropModal.priceUnitKg')}</option>
                <option value="PER_QUINTAL">{t('farmer.cropModal.priceUnitQuintal')}</option>
                <option value="PER_TON">{t('farmer.cropModal.priceUnitTonne')}</option>
                <option value="PER_DOZEN">{t('farmer.cropModal.priceUnitDozen')}</option>
              </select>
            </div>
          </div>

          {/* Stock Availability Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
                {t('farmer.cropModal.stock')}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                placeholder={t('farmer.cropModal.stockPlaceholder')}
                value={formData.quantityAvailable}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantityAvailable: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">{t('farmer.cropModal.stockUnit')}</label>
              <select
                value={formData.quantityUnit}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantityUnit: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="KG">{t('farmer.cropModal.stockUnitKg')}</option>
                <option value="QUINTAL">{t('farmer.cropModal.stockUnitQuintal')}</option>
                <option value="TON">{t('farmer.cropModal.stockUnitTonne')}</option>
                <option value="CRATES">{t('farmer.cropModal.stockUnitCrates')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
              {t('farmer.cropModal.minOrder')}
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              required
              placeholder={t('farmer.cropModal.minOrderPlaceholder')}
              value={formData.minOrderKg}
              onChange={(e) => setFormData((prev) => ({ ...prev, minOrderKg: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          {/* Organic Produce Toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.isOrganic}
              onChange={(e) => setFormData((prev) => ({ ...prev, isOrganic: e.target.checked }))}
              className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-stone-700">{t('farmer.cropModal.organic')}</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              {t('farmer.common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-transform active:scale-95 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('farmer.cropModal.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
