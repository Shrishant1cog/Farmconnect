'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { useSocket } from '../../../hooks/useSocket';
import { useI18n } from '../../../hooks/useI18n';
import { ShieldCheck, MapPin, Send, History } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, formatDate, formatCurrency } = useI18n();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [enquiryError, setEnquiryError] = useState('');
  const socket = useSocket();

  useEffect(() => {
    if (!id) return;
    fetchApi(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('join_product_room', id);

    socket.on('product_updated', (updated: any) => {
      if (updated.productId === id) {
        setProduct((prev: any) => ({
          ...prev,
          farmerPrice: updated.farmerPrice,
          quantityAvailable: updated.quantityAvailable,
          isAvailable: updated.isAvailable,
        }));
      }
    });

    return () => {
      socket.emit('leave_product_room', id);
      socket.off('product_updated');
    };
  }, [socket, id]);

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryStatus('sending');
    setEnquiryError('');
    try {
      await fetchApi('/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          productId: id,
          subject,
          message,
        }),
      });
      setEnquiryStatus('success');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setEnquiryError(err?.message || '');
      setEnquiryStatus('error');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-stone-500">{t('consumer.product.loadingDetails')}</div>;
  }
  if (!product) {
    return <div className="p-10 text-center text-red-500">{t('consumer.product.notFound')}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: Image & Badge */}
        <div>
          <div className="relative h-96 rounded-3xl overflow-hidden border border-stone-200 shadow-sm bg-stone-100">
            <img
              src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {product.isOrganic && (
              <span className="absolute top-4 left-4 bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                {t('consumer.product.organicCertified')}
              </span>
            )}
          </div>

          {/* Audit Trail of Price Changes */}
          {product.priceHistories && product.priceHistories.length > 0 && (
            <div className="mt-6 bg-stone-100 p-4 rounded-2xl border border-stone-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5 mb-2">
                <History className="w-4 h-4" /> {t('consumer.product.priceHistory')}
              </h4>
              <ul className="text-xs space-y-1 text-stone-600">
                {product.priceHistories.map((ph: any) => (
                  <li key={ph.id}>
                    {t('consumer.product.adjustedPrice', {
                      oldPrice: formatCurrency(Number(ph.oldPrice) || 0, { maximumFractionDigits: 0 }),
                      newPrice: formatCurrency(Number(ph.newPrice) || 0, { maximumFractionDigits: 0 }),
                      date: formatDate(ph.changedAt),
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Details & Direct Enquiry */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-4 h-4" /> {product.farmer?.district}, Karnataka
            </div>
            <h1 className="text-3xl font-black text-stone-900 mt-1">{product.title}</h1>
            {(product.cropName || product.variety || product.category?.name) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-emerald-800 mt-2">
                {product.cropName && (
                  <span>{t('common.crop')}: {product.cropName}</span>
                )}
                {product.variety && (
                  <span>{t('common.variety')}: {product.variety}</span>
                )}
                {product.category?.name && (
                  <span>{t('common.category')}: {product.category.name}</span>
                )}
              </div>
            )}
            <p className="text-sm text-stone-600 mt-2">{product.description}</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-baseline justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider block">
                {t('consumer.product.farmerPrice')}
              </span>
              <span className="text-3xl font-black text-emerald-950">
                {formatCurrency(Number(product.farmerPrice) || 0, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-sm font-semibold text-emerald-800"> /{product.priceUnit.replace('PER_', '').toLowerCase()}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-500 block">{t('consumer.product.stockOnFarm')}</span>
              <span className="text-sm font-bold text-stone-800">{product.quantityAvailable} {product.quantityUnit}</span>
            </div>
          </div>

          {/* Farm & Cultivator Identity */}
          <div className="p-4 rounded-2xl border border-stone-200 bg-white">
            <h3 className="font-bold text-stone-900 text-sm">{product.farmer?.farmName}</h3>
            <p className="text-xs text-stone-600 mt-0.5">
              {t('consumer.product.farmerLabel', { name: product.farmer?.user?.name })}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              {t('consumer.product.locationLabel', { location: product.farmer?.addressLine })}
            </p>
          </div>

          {/* Direct Enquiry Form */}
          <form onSubmit={handleSendEnquiry} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">
              {t('consumer.product.enquiryTitle')}
            </h3>
            {enquiryStatus === 'success' && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {t('consumer.product.enquirySuccess')}
              </p>
            )}
            {enquiryStatus === 'error' && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg">
                {t('consumer.product.enquiryError', { message: enquiryError })}
              </p>
            )}
            <input
              type="text"
              placeholder={t('consumer.product.requirementPlaceholder')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
            />
            <textarea
              placeholder={t('consumer.product.detailPlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
            />
            <button
              type="submit"
              disabled={enquiryStatus === 'sending'}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />{' '}
              {enquiryStatus === 'sending'
                ? t('consumer.product.transmitting')
                : t('consumer.product.transmit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}