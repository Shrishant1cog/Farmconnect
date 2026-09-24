'use client';

import React, { useState } from 'react';
import { X, Sprout, Loader2, Edit3 } from 'lucide-react';
import CropImageUpload from '../ui/CropImageUpload';

interface EditCropModalProps {
  crop: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

export default function EditCropModal({ crop, isOpen, onClose, onSuccess }: EditCropModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: crop.title || '',
    description: crop.description || '',
    farmerPrice: crop.farmerPrice?.toString() || '',
    priceUnit: crop.priceUnit || 'PER_KG',
    quantityAvailable: crop.quantityAvailable?.toString() || '',
    quantityUnit: crop.quantityUnit || 'KG',
    isOrganic: Boolean(crop.isOrganic),
    imageUrl: crop.imageUrl || '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${crop.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (json.success) {
        onSuccess(json.data);
        onClose();
      } else {
        alert(json.message || 'Failed to update harvest lot');
      }
    } catch {
      alert('Network error updating harvest lot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">Edit Crop Harvest Details</h2>
              <p className="text-xs text-stone-500">Update pricing, stock availability, or refresh crop photos.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CropImageUpload
            value={formData.imageUrl}
            onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
          />

          <div>
            <label className="text-xs font-bold uppercase text-stone-700 block mb-1">Produce Name *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">Farmer Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.farmerPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, farmerPrice: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">Price Unit</label>
              <select
                value={formData.priceUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, priceUnit: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="PER_KG">Per Kg</option>
                <option value="PER_QUINTAL">Per Quintal</option>
                <option value="PER_TON">Per Tonne</option>
                <option value="PER_DOZEN">Per Dozen</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">Available Stock *</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.quantityAvailable}
                onChange={(e) => setFormData(prev => ({ ...prev, quantityAvailable: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">Stock Unit</label>
              <select
                value={formData.quantityUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, quantityUnit: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="KG">Kg</option>
                <option value="QUINTAL">Quintal</option>
                <option value="TON">Tonne</option>
                <option value="CRATES">Crates</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.isOrganic}
              onChange={(e) => setFormData(prev => ({ ...prev, isOrganic: e.target.checked }))}
              className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-stone-700">Certified 100% Organic Produce</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-transform active:scale-95 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}