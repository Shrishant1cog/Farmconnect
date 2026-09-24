'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, ShieldAlert, Activity, CheckCircle, Ban, Power, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../../lib/api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'complaints'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token') || '';
  };

  const executeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      return await fetchApi(endpoint, options);
    } catch {
      // Fallback direct fetch if helper handles URL formatting differently
      const token = getAuthToken();
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const res = await fetch(`${baseUrl}${cleanEndpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
      return await res.json();
    }
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // Corrected route: /admin/metrics (previously /dashboard/admin)
      const [statsRes, usersRes, complaintsRes] = await Promise.all([
        executeApiCall('/admin/metrics').catch((err) => {
          console.warn('Metrics endpoint error:', err);
          return null;
        }),
        executeApiCall('/admin/users').catch((err) => {
          console.warn('Users endpoint error:', err);
          return null;
        }),
        executeApiCall('/admin/complaints').catch((err) => {
          console.warn('Complaints endpoint error:', err);
          return null;
        }),
      ]);

      if (statsRes) {
        const statsPayload = statsRes?.data?.stats || statsRes?.data || statsRes?.stats || statsRes;
        if (statsPayload && typeof statsPayload === 'object') {
          setStats(statsPayload);
        }
      }

      if (usersRes) {
        const userList = usersRes?.data?.users || usersRes?.data || usersRes?.users || (Array.isArray(usersRes) ? usersRes : []);
        if (Array.isArray(userList)) {
          setUsers(userList);
        }
      }

      if (complaintsRes) {
        const complaintList = complaintsRes?.data?.complaints || complaintsRes?.data || complaintsRes?.complaints || (Array.isArray(complaintsRes) ? complaintsRes : []);
        if (Array.isArray(complaintList)) {
          setComplaints(complaintList);
        }
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setErrorMessage(err.message || 'Failed to load command center data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const toggleUserStatus = async (userId: string) => {
    if (!confirm("Are you sure you want to change this user's access?")) return;
    try {
      await executeApiCall(`/admin/users/${userId}/toggle-status`, {
        method: 'PATCH',
      });
      fetchAdminData();
    } catch (e) {
      alert('Failed to update user access status.');
    }
  };

  const resolveComplaint = async (complaintId: string) => {
    const notes = prompt('Enter resolution notes:');
    if (notes === null) return;
    try {
      await executeApiCall(`/admin/complaints/${complaintId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ adminNotes: notes }),
      });
      fetchAdminData();
    } catch (e) {
      alert('Failed to resolve complaint.');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-300 border-t-stone-900 mb-4" />
        <p className="font-bold text-stone-600 text-sm">Loading Command Center...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-700" /> Admin Command Center
          </h1>
          <p className="text-stone-600 text-sm mt-1">Platform moderation, user management, and conflict resolution.</p>
        </div>
        <button
          onClick={() => fetchAdminData()}
          className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-semibold">{errorMessage}</span>
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
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Total Users</p>
              <p className="text-4xl font-black text-stone-900">{stats.totalUsers ?? 0}</p>
              <div className="flex gap-4 mt-2 text-xs font-medium text-stone-500">
                <span>{stats.totalFarmers ?? 0} Farmers</span>
                <span>{stats.totalConsumers ?? 0} Consumers</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Active Crops</p>
              <p className="text-4xl font-black text-emerald-700">
                {stats.activeProducts ?? stats.totalProducts ?? 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Total Enquiries</p>
              <p className="text-4xl font-black text-blue-700">{stats.totalEnquiries ?? 0}</p>
            </div>
            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Activity className="w-4 h-4" /> Pending Reports
              </p>
              <p className="text-4xl font-black text-rose-900">{stats.pendingComplaints ?? 0}</p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-sm font-semibold">
            No statistics metrics available currently.
          </div>
        )
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stone-500 font-semibold">
                    No users registered yet.
                  </td>
                </tr>
              ) : (
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
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-700">
                          <Ban className="w-3 h-3" /> Suspended
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
                        <Power className="w-3 h-3" /> {user.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: COMPLAINTS / REPORTS */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {complaints.length === 0 ? (
            <p className="text-stone-500 font-bold p-8 text-center bg-stone-50 rounded-2xl">No complaints filed.</p>
          ) : (
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
                      {complaint.status}
                    </span>
                    <span className="text-xs font-bold text-stone-500">
                      Reported by: {complaint.reporter?.name || 'Anonymous User'}
                    </span>
                  </div>
                  <h3 className="font-bold text-stone-900">{complaint.subject}</h3>
                  <p className="text-sm text-stone-600 mt-1">{complaint.reason}</p>
                  {complaint.adminNotes && (
                    <p className="text-xs font-medium text-emerald-700 mt-3 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <strong>Resolution Note:</strong> {complaint.adminNotes}
                    </p>
                  )}
                </div>
                {complaint.status === 'PENDING' && (
                  <div className="flex items-start">
                    <button
                      onClick={() => resolveComplaint(complaint.id)}
                      className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}