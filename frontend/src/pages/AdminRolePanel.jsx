import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Avatar from '../components/Avatar';
import { Shield, Lock, Users, Check, X } from 'lucide-react';

const AdminRolePanel = () => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState('');

  const ADMIN_PASSWORD = 'adminpassword';

  useEffect(() => {
    if (authenticated) {
      loadUsers();
    }
  }, [authenticated]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setSaving(prev => ({ ...prev, [userId]: true }));
      await api.updateUserRole(userId, newRole);
      await loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert(error.message || 'Failed to update user role');
    } finally {
      setSaving(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="card w-full max-w-md p-8 animate-scale-in">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary-700" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 text-center mb-2">
            Admin Role Panel
          </h1>
          <p className="text-surface-500 text-center mb-6">
            Enter the admin password to access role management
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="input"
                placeholder="Enter admin password"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              <Lock className="w-4 h-4" />
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-primary-100">
          <Shield className="w-6 h-6 text-primary-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Role Management</h1>
          <p className="text-surface-500 text-sm">Assign user roles: normal, marketing, or admin</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-surface-600" />
            <h3 className="font-semibold text-surface-900">All Users</h3>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="text-left py-3 px-6 font-medium text-surface-600">User</th>
                  <th className="text-left py-3 px-6 font-medium text-surface-600">Email</th>
                  <th className="text-left py-3 px-6 font-medium text-surface-600">Current Role</th>
                  <th className="text-left py-3 px-6 font-medium text-surface-600">Assign Role</th>
                  <th className="text-left py-3 px-6 font-medium text-surface-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="md" />
                        <span className="text-surface-900 font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-surface-600">{user.email}</td>
                    <td className="py-3 px-6">
                      <span className={`badge capitalize ${
                        user.role === 'admin' ? 'badge-warning' : 
                        user.role === 'marketing' ? 'badge-info' : 
                        'badge-default'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={saving[user.id]}
                        className="input py-1.5 text-sm w-40 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="normal">Normal</option>
                        <option value="marketing">Marketing</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-6">
                      {saving[user.id] ? (
                        <div className="flex items-center gap-2 text-surface-500">
                          <div className="w-4 h-4 border-2 border-surface-300 border-t-primary-600 rounded-full animate-spin" />
                          <span className="text-xs">Saving...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <Check className="w-4 h-4" />
                          <span className="text-xs">Saved</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRolePanel;

