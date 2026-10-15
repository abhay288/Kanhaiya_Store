import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, RefreshCw, Trash2, Edit2, Shield,
  AlertCircle, X
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface AdminUsersManagementProps {
  onToast: (type: 'success' | 'error', message: string) => void;
}

interface MongoUser {
  _id: string;
  name?: string;
  displayName?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  role: 'CUSTOMER' | 'ADMIN';
  status: 'ACTIVE' | 'BLOCKED';
  createdAt?: string;
}

const ROOT_ADMIN_EMAIL = 'kanhaiyaastore@gmail.com';

export const AdminUsersManagement: React.FC<AdminUsersManagementProps> = ({ onToast }) => {
  const [users, setUsers] = useState<MongoUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'CUSTOMER' | 'ADMIN'>('CUSTOMER');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<MongoUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'CUSTOMER' | 'ADMIN'>('CUSTOMER');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'BLOCKED'>('ACTIVE');

  // Deletion confirm
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers(false);

    // Real-time synchronization: Poll MongoDB users every 8 seconds silently
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 8000);

    const handleExternalUserUpdate = () => {
      fetchUsers(true);
    };
    window.addEventListener('kgs_profile_updated', handleExternalUserUpdate);
    window.addEventListener('kgs_user_updated', handleExternalUserUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('kgs_profile_updated', handleExternalUserUpdate);
      window.removeEventListener('kgs_user_updated', handleExternalUserUpdate);
    };
  }, [roleFilter, statusFilter]);

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.getAdminUsers({
        search: search.trim() || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100,
      });
      if (res.data?.users) {
        setUsers(res.data.users);
      } else {
        setUsers([]);
      }
    } catch (err: unknown) {
      if (!silent) {
        const e = err as { message?: string };
        onToast('error', `Failed to load MongoDB users: ${e?.message || 'Error'}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  // Add User directly to MongoDB
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserPhone.trim() && !newUserEmail.trim()) {
      onToast('error', 'Please provide either a Phone number or Email address.');
      return;
    }
    setSubmittingUser(true);
    try {
      await apiClient.createAdminUser({
        displayName: newUserName.trim() || undefined,
        phone: newUserPhone.trim() || undefined,
        email: newUserEmail.trim() || undefined,
        role: newUserRole,
        password: newUserPassword.trim() || undefined,
        status: 'ACTIVE',
      });
      onToast('success', `✅ User ${newUserName || newUserPhone || newUserEmail} created directly in MongoDB!`);
      setShowAddModal(false);
      setNewUserName('');
      setNewUserPhone('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('CUSTOMER');
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onToast('error', `Failed to create user: ${e?.message || 'Database error'}`);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: MongoUser) => {
    setEditingUser(user);
    setEditName(user.displayName || user.name || '');
    setEditPhone(user.phoneNumber || user.phone || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'CUSTOMER');
    setEditStatus(user.status || 'ACTIVE');
  };

  // Submit Edit
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingUser(true);
    try {
      await apiClient.updateAdminUser(editingUser._id, {
        displayName: editName.trim() || undefined,
        phoneNumber: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        role: editRole,
        status: editStatus,
        isActive: editStatus === 'ACTIVE',
      });
      onToast('success', `✅ User details updated in MongoDB!`);
      setEditingUser(null);
      fetchUsers(true);
      window.dispatchEvent(new CustomEvent('kgs_user_updated', { detail: { userId: editingUser._id } }));
    } catch (err: unknown) {
      const e = err as { message?: string };
      onToast('error', `Failed to update user: ${e?.message || 'Error'}`);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Toggle Role directly
  const handleToggleRole = async (user: MongoUser) => {
    if (user.email === ROOT_ADMIN_EMAIL) {
      onToast('error', 'Root Administrator role cannot be changed.');
      return;
    }
    const nextRole: 'CUSTOMER' | 'ADMIN' = user.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    try {
      await apiClient.updateAdminUser(user._id, { role: nextRole });
      onToast('success', `User role changed to ${nextRole}`);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: nextRole } : u)));
      window.dispatchEvent(new CustomEvent('kgs_user_updated', { detail: { userId: user._id, role: nextRole } }));
    } catch (err: unknown) {
      const e = err as { message?: string };
      onToast('error', e?.message || 'Role change failed');
    }
  };

  // Toggle Active / Blocked
  const handleToggleStatus = async (user: MongoUser) => {
    if (user.email === ROOT_ADMIN_EMAIL) {
      onToast('error', 'Root Administrator cannot be blocked.');
      return;
    }
    const currentIsActive = user.status === 'ACTIVE' || (user as any).isActive === true;
    const nextStatus: 'ACTIVE' | 'BLOCKED' = currentIsActive ? 'BLOCKED' : 'ACTIVE';
    try {
      await apiClient.updateAdminUser(user._id, { status: nextStatus, isActive: nextStatus === 'ACTIVE' });
      onToast('success', `User is now ${nextStatus}`);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, status: nextStatus, isActive: nextStatus === 'ACTIVE' } : u)));
      window.dispatchEvent(new CustomEvent('kgs_user_updated', { detail: { userId: user._id, status: nextStatus } }));
    } catch (err: unknown) {
      const e = err as { message?: string };
      onToast('error', e?.message || 'Status change failed');
    }
  };

  // Delete User
  const handleDeleteUser = async (user: MongoUser) => {
    if (user.email === ROOT_ADMIN_EMAIL) {
      onToast('error', 'Root Administrator account cannot be deleted.');
      return;
    }
    try {
      await apiClient.deleteAdminUser(user._id);
      onToast('success', `User deleted permanently from MongoDB.`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      setDeletingUserId(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      onToast('error', e?.message || 'Delete user failed');
    }
  };

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const customerCount = users.filter((u) => u.role === 'CUSTOMER').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header & Stats Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '14px 16px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              👥 MongoDB User Management
            </h3>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                backgroundColor: '#e0e7ff',
                color: '#3730a3',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              Direct Mongo CRUD
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
            Manage customer accounts, roles (Customer/Admin), active status, and direct database entries.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              fontSize: '0.78rem',
              fontWeight: 800,
              border: '1px solid #c7d2fe',
            }}
          >
            🛡️ {adminCount} Admins
          </span>

          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              fontSize: '0.78rem',
              fontWeight: 800,
              border: '1px solid #bfdbfe',
            }}
          >
            👤 {customerCount} Customers
          </span>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <UserPlus size={16} /> + New User
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search users by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 34px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '0.82rem',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-main)',
            }}
          />
        </form>

        {/* Role Filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['ALL', 'CUSTOMER', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: roleFilter === r ? '2px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: roleFilter === r ? 'var(--primary-subtle)' : 'var(--surface)',
                color: roleFilter === r ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {r === 'ALL' ? 'All Roles' : r === 'ADMIN' ? '🛡️ Admins' : '👤 Customers'}
            </button>
          ))}

          {/* Status Filters */}
          {(['ALL', 'ACTIVE', 'BLOCKED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === s ? '2px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: statusFilter === s ? 'var(--primary-subtle)' : 'var(--surface)',
                color: statusFilter === s ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {s === 'ALL' ? 'All Status' : s === 'ACTIVE' ? 'Active' : 'Blocked'}
            </button>
          ))}

          <button
            onClick={() => fetchUsers(false)}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              color: 'var(--text-main)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Users List */}
      {loading && users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Loading MongoDB users...
        </div>
      ) : users.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <Users size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>No users found in MongoDB</div>
          <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            {search ? 'Try clearing the search query.' : 'Click "+ New User" to register a user directly in MongoDB.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {users.map((u) => {
            const isRootAdmin = u.email === ROOT_ADMIN_EMAIL;
            const isAdmin = u.role === 'ADMIN';
            const isActive = u.status === 'ACTIVE' || (u as any).isActive === true;
            const initials = (u.displayName || u.name || u.phone || u.email || 'U').slice(0, 2).toUpperCase();

            return (
              <div
                key={u._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  border: isRootAdmin ? '2px solid #a855f7' : '1px solid var(--border)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: isAdmin ? '#ede9fe' : '#e0f2fe',
                    color: isAdmin ? '#6d28d9' : '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* User Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {u.displayName || u.name || 'Unnamed User'}
                    </span>

                    {/* Role Badge */}
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: isRootAdmin ? '#f3e8ff' : isAdmin ? '#ede9fe' : '#f1f5f9',
                        color: isRootAdmin ? '#7e22ce' : isAdmin ? '#6d28d9' : '#475569',
                        border: isRootAdmin ? '1px solid #d8b4fe' : isAdmin ? '1px solid #ddd6fe' : '1px solid #cbd5e1',
                      }}
                    >
                      {isAdmin ? <Shield size={12} /> : null}
                      {isRootAdmin ? '👑 ROOT ADMIN' : u.role || 'CUSTOMER'}
                    </span>

                    {/* Status Badge */}
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
                        color: isActive ? '#166534' : '#991b1b',
                      }}
                    >
                      {isActive ? 'ACTIVE' : 'BLOCKED'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {(u.phoneNumber || u.phone) && <span>📞 +91 {u.phoneNumber || u.phone}</span>}
                    {u.email && <span>✉️ {u.email}</span>}
                    {u.createdAt && (
                      <span>Joined: {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {/* Role Toggle Button */}
                  {!isRootAdmin && (
                    <button
                      onClick={() => handleToggleRole(u)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        color: isAdmin ? '#6d28d9' : '#0369a1',
                        cursor: 'pointer',
                      }}
                      title={isAdmin ? 'Demote to Customer' : 'Promote to Admin'}
                    >
                      {isAdmin ? 'Demote' : 'Make Admin'}
                    </button>
                  )}

                  {/* Status Toggle Button */}
                  {!isRootAdmin && (
                    <button
                      onClick={() => handleToggleStatus(u)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        backgroundColor: isActive ? '#fef2f2' : '#f0fdf4',
                        color: isActive ? '#991b1b' : '#166534',
                        cursor: 'pointer',
                      }}
                      title={isActive ? 'Block User' : 'Unblock User'}
                    >
                      {isActive ? 'Block' : 'Unblock'}
                    </button>
                  )}

                  {/* Edit Button */}
                  <button
                    onClick={() => openEditModal(u)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                    title="Edit User in MongoDB"
                  >
                    <Edit2 size={14} />
                  </button>

                  {/* Delete Button */}
                  {!isRootAdmin && (
                    <button
                      onClick={() => setDeletingUserId(u._id)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                      title="Permanently Delete User from MongoDB"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD USER DIRECTLY TO MONGODB                      */}
      {/* ======================================================== */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              color: '#0f172a',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '460px',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Add New User to MongoDB</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. user@gmail.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      backgroundColor: '#fff',
                    }}
                  >
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Initial Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Optional password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  style={{
                    flex: 2,
                    padding: '9px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: submittingUser ? 'wait' : 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  {submittingUser ? 'Saving to MongoDB...' : 'Save User to MongoDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT USER DETAILS IN MONGODB                      */}
      {/* ======================================================== */}
      {editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              color: '#0f172a',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '460px',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Edit MongoDB User</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    disabled={editingUser.email === ROOT_ADMIN_EMAIL}
                    onChange={(e) => setEditEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      backgroundColor: editingUser.email === ROOT_ADMIN_EMAIL ? '#f1f5f9' : '#fff',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Role
                  </label>
                  <select
                    value={editRole}
                    disabled={editingUser.email === ROOT_ADMIN_EMAIL}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      backgroundColor: '#fff',
                    }}
                  >
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={editStatus}
                    disabled={editingUser.email === ROOT_ADMIN_EMAIL}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      backgroundColor: '#fff',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  style={{
                    flex: 2,
                    padding: '9px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: submittingUser ? 'wait' : 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  {submittingUser ? 'Updating in MongoDB...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRM DELETE DIALOG                                   */}
      {/* ======================================================== */}
      {deletingUserId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1200,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              color: '#0f172a',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '400px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>Permanently Delete User?</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
              This will permanently remove the user record directly from the MongoDB collection. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeletingUserId(null)}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = users.find((u) => u._id === deletingUserId);
                  if (target) handleDeleteUser(target);
                }}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
