'use client';

import React, { useEffect, useState } from 'react';
import { Users, ShieldAlert, Activity, CheckCircle, Ban, Power } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'complaints'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    const token = localStorage.getItem('fc_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    
    try {
      const [statsRes, usersRes, complaintsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/admin`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/complaints`, { headers }).then(r => r.json())
      ]);
      
      if (statsRes.success) setStats(statsRes.data.stats);
      if (usersRes.success) setUsers(usersRes.data);
      if (complaintsRes.success) setComplaints(complaintsRes.data);
    } catch (e) {
      console.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const toggleUserStatus = async (userId: string) => {
    if (!confirm("Are you sure you want to change this user's access?")) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('fc_token')}` }
      });
      fetchAdminData();
    } catch (e) {
      alert("Action failed.");
    }
  };

  const resolveComplaint = async (complaintId: string) => {
    const notes = prompt("Enter resolution notes:");
    if (notes === null) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/complaints/${complaintId}/resolve`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fc_token')}` 
        },
        body: JSON.stringify({ adminNotes: notes })
      });
      fetchAdminData();
    } catch (e) {
      alert("Action failed.");
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-stone-500">Loading Command Center...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-rose-700" /> Admin Command Center
        </h1>
        <p className="text-stone-600 text-sm mt-1">Platform moderation, user management, and conflict resolution.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-stone-200 pb-px">
        {['overview', 'users', 'complaints'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-5 py-2.5 text-sm font-bold uppercase tracking-wider rounded-t-xl transition-colors ${activeTab === tab ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Total Users</p>
            <p className="text-4xl font-black text-stone-900">{stats.totalUsers}</p>
            <div className="flex gap-4 mt-2 text-xs font-medium text-stone-500">
              <span>{stats.totalFarmers} Farmers</span>
              <span>{stats.totalConsumers} Consumers</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Active Crops</p>
            <p className="text-4xl font-black text-emerald-700">{stats.activeProducts}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Total Enquiries</p>
            <p className="text-4xl font-black text-blue-700">{stats.totalEnquiries}</p>
          </div>
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm">
            <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1"><Activity className="w-4 h-4"/> Pending Reports</p>
            <p className="text-4xl font-black text-rose-900">{stats.pendingComplaints}</p>
          </div>
        </div>
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
              {users.map(user => (
                <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-stone-900">{user.name}</p>
                    <p className="text-xs text-stone-500">{user.email} • {user.phone}</p>
                  </td>
                  <td className="px-6 py-4 font-black text-[10px] uppercase tracking-wider">
                    <span className={`px-2 py-1 rounded-md ${user.role === 'FARMER' ? 'bg-emerald-100 text-emerald-800' : user.role === 'ADMIN' ? 'bg-stone-800 text-white' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive 
                      ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle className="w-3 h-3"/> Active</span>
                      : <span className="flex items-center gap-1 text-xs font-bold text-rose-700"><Ban className="w-3 h-3"/> Suspended</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleUserStatus(user.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition-colors ${user.isActive ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                    >
                      <Power className="w-3 h-3" /> {user.isActive ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: COMPLAINTS / REPORTS */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {complaints.length === 0 && <p className="text-stone-500 font-bold p-8 text-center bg-stone-50 rounded-2xl">No complaints filed.</p>}
          {complaints.map(complaint => (
            <div key={complaint.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between gap-4 ${complaint.status === 'RESOLVED' ? 'bg-stone-50 border-stone-200 opacity-70' : 'bg-white border-rose-200 shadow-sm'}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${complaint.status === 'PENDING' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {complaint.status}
                  </span>
                  <span className="text-xs font-bold text-stone-500">Reported by: {complaint.reporter?.name}</span>
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
          ))}
        </div>
      )}
    </div>
  );
}