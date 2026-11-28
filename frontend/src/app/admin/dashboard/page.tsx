'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, ShieldAlert, Activity, CheckCircle, Ban, Power, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import {
  errorKeyForStatus,
  extractComplaintList,
  extractMetrics,
  extractUserList,
  failedState,
  firstFailure,
  loadedState,
  type AdminResource,
  type AdminResourceState,
} from '../../../lib/adminResources';
import { useI18n } from '../../../hooks/useI18n';

export default function AdminDashboard() {
  const { t, formatNumber } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'complaints'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * What actually happened to every resource.
   *
   * `loaded` is **false** until the shared backend answered with the data.
   * That distinction matters: an empty list means "there is nothing", while
   * a failed request means "nothing is known". The dashboard used to treat
   * a failed request as an empty list and an empty metric set, so a
   * visitor without administrator rights saw a plausible looking
   * dashboard full of zeros — a statement about the platform that nobody
   * had verified.
   */
  const [resources, setResources] = useState<Record<AdminResource, AdminResourceState>>({
    metrics: failedState(null),
    users: failedState(null),
    complaints: failedState(null),
  });

  /**
   * Every call goes through `fetchApi`, which **throws** on a non-2xx
   * answer and carries the HTTP status on the error.
   *
   * The old code had a second, direct `fetch` in the `catch` branch that
   * ignored the status code and returned the error body as if it were the
   * requested data — so a 403 became "zero users, zero complaints". The
   * second call was also made against a possibly empty base URL, which
   * left the page waiting for an answer that never came.
   */
  const executeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    return fetchApi(endpoint, options);
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const load = async (
      resource: AdminResource,
      endpoint: string,
      apply: (payload: any) => void
    ) => {
      try {
        const res = await executeApiCall(endpoint);
        apply(res);
        setResources((prev) => ({ ...prev, [resource]: loadedState }));
        return loadedState;
      } catch (err: any) {
        console.warn(`Admin resource "${resource}" could not be loaded:`, err);
        const state = failedState(err?.status);
        setResources((prev) => ({ ...prev, [resource]: state }));
        return state;
      }
    };

    const results = await Promise.all([
      load('metrics', '/admin/metrics', (res) => {
        const payload = extractMetrics(res);
        if (payload) {
          setStats(payload);
        }
      }),
      load('users', '/admin/users', (res) => {
        const list = extractUserList(res);
        if (list) {
          setUsers(list);
        }
      }),
      load('complaints', '/admin/complaints', (res) => {
        const list = extractComplaintList(res);
        if (list) {
          setComplaints(list);
        }
      }),
    ]);

    // The banner reports the **first** failure. The status decides the
    // wording: a 403 means the account may not read the data at all, any
    // other status means the platform could not answer.
    const failure = firstFailure({
      metrics: results[0],
      users: results[1],
      complaints: results[2],
    });
    if (failure) {
      setErrorMessage(failure.state.errorKey ?? errorKeyForStatus(failure.state.status));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const toggleUserStatus = async (userId: string) => {
    if (!confirm(t('misc.admin.confirmAccessChange'))) return;
    try {
      await executeApiCall(`/admin/users/${userId}/toggle-status`, {
        method: 'PATCH',
      });
      fetchAdminData();
    } catch (e) {
      alert(t('misc.admin.accessUpdateError'));
    }
  };

  const resolveComplaint = async (complaintId: string) => {
    const notes = prompt(t('misc.admin.resolutionNotesPrompt'));
    if (notes === null) return;
    try {
      await executeApiCall(`/admin/complaints/${complaintId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ adminNotes: notes }),
      });
      fetchAdminData();
    } catch (e) {
      alert(t('misc.admin.complaintResolveError'));
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-300 border-t-stone-900 mb-4" />
        <p className="font-bold text-stone-600 text-sm">{t('misc.admin.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-700" /> {t('misc.admin.title')}
          </h1>
          <p className="text-stone-600 text-sm mt-1">{t('misc.admin.subtitle')}</p>
        </div>
        <button
          onClick={() => fetchAdminData()}
          className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {t('misc.admin.refresh')}
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-semibold">{t(errorMessage)}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-stone-200 pb-px">
        {(['overview', 'users', 'complaints'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-bold uppercase tracking-wider rounded-t-xl transition-colors ${
              activeTab === tab ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            {tab === 'overview'
              ? t('misc.admin.tabOverview')
              : tab === 'users'
                ? t('misc.admin.tabUsers')
                : t('misc.admin.tabComplaints')}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        resources.metrics.loaded && stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('misc.admin.totalUsers')}</p>
              <p className="text-4xl font-black text-stone-900">{formatNumber(stats.totalUsers ?? 0)}</p>
              <div className="flex gap-4 mt-2 text-xs font-medium text-stone-500">
                <span>{formatNumber(stats.totalFarmers ?? 0)} {t('misc.admin.farmers')}</span>
                <span>{formatNumber(stats.totalConsumers ?? 0)} {t('misc.admin.consumers')}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('misc.admin.activeCrops')}</p>
              <p className="text-4xl font-black text-emerald-700">
                {formatNumber(stats.activeProducts ?? stats.totalProducts ?? 0)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('misc.admin.totalEnquiries')}</p>
              <p className="text-4xl font-black text-blue-700">{formatNumber(stats.totalEnquiries ?? 0)}</p>
            </div>
            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Activity className="w-4 h-4" /> {t('misc.admin.pendingReports')}
              </p>
              <p className="text-4xl font-black text-rose-900">{formatNumber(stats.pendingComplaints ?? 0)}</p>
            </div>
          </div>
        ) : resources.metrics.loaded ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-sm font-semibold">
            {t('misc.admin.noStats')}
          </div>
        ) : (
          // The metrics were **not** read. Saying "0 users" here would be
          // a statement about the platform that nobody has verified.
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-sm font-semibold">
            {t(resources.metrics.errorKey ?? 'misc.admin.loadError')}
          </div>
        )
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">{t('misc.admin.user')}</th>
                <th className="px-6 py-4">{t('misc.admin.role')}</th>
                <th className="px-6 py-4">{t('misc.admin.status')}</th>
                <th className="px-6 py-4 text-right">{t('misc.admin.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {resources.users.loaded && users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stone-500 font-semibold">
                    {t('misc.admin.noUsers')}
                  </td>
                </tr>
              ) : resources.users.loaded ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-stone-900">{user.name}</p>
                      <p className="text-xs text-stone-500">{user.email} • {user.phone}</p>
                    </td>
                    <td className="px-6 py-4 font-black text-[10px] uppercase tracking-wider">
                      <span
                        className={`px-2 py-1 rounded-md ${
                          user.role === 'FARMER'
                            ? 'bg-emerald-100 text-emerald-800'
                            : user.role === 'ADMIN'
                            ? 'bg-stone-800 text-white'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.role === 'FARMER'
                          ? t('misc.role.farmer')
                          : user.role === 'ADMIN'
                            ? t('misc.role.admin')
                            : t('misc.role.consumer')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle className="w-3 h-3" /> {t('misc.status.active')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-700">
                          <Ban className="w-3 h-3" /> {t('misc.status.suspended')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition-colors ${
                          user.isActive
                            ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        }`}
                      >
                        <Power className="w-3 h-3" /> {user.isActive ? t('misc.admin.suspend') : t('misc.admin.reactivate')}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stone-500 font-semibold">
                    {t(resources.users.errorKey ?? 'misc.admin.loadError')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: COMPLAINTS / REPORTS */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {resources.complaints.loaded && complaints.length === 0 ? (
            <p className="text-stone-500 font-bold p-8 text-center bg-stone-50 rounded-2xl">{t('misc.admin.noComplaints')}</p>
          ) : resources.complaints.loaded ? (
            complaints.map((complaint) => (
              <div
                key={complaint.id}
                className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between gap-4 ${
                  complaint.status === 'RESOLVED' ? 'bg-stone-50 border-stone-200 opacity-70' : 'bg-white border-rose-200 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        complaint.status === 'PENDING' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {complaint.status === 'PENDING'
                        ? t('misc.status.pending')
                        : t('misc.status.resolved')}
                    </span>
                    <span className="text-xs font-bold text-stone-500">
                      {t('misc.admin.reportedBy')} {complaint.reporter?.name || t('misc.admin.anonymousUser')}
                    </span>
                  </div>
                  <h3 className="font-bold text-stone-900">{complaint.subject}</h3>
                  <p className="text-sm text-stone-600 mt-1">{complaint.reason}</p>
                  {complaint.adminNotes && (
                    <p className="text-xs font-medium text-emerald-700 mt-3 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <strong>{t('misc.admin.resolutionNote')}</strong> {complaint.adminNotes}
                    </p>
                  )}
                </div>
                {complaint.status === 'PENDING' && (
                  <div className="flex items-start">
                    <button
                      onClick={() => resolveComplaint(complaint.id)}
                      className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors"
                    >
                      {t('misc.admin.markResolved')}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-stone-500 font-bold p-8 text-center bg-stone-50 rounded-2xl">
              {t(resources.complaints.errorKey ?? 'misc.admin.loadError')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}