import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Avatar from '../components/Avatar';
import {
  Shield,
  Users,
  Activity,
  Clock,
  FileText,
  Edit,
  Trash,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const actionIcons = {
  create: <Plus className="w-4 h-4 text-emerald-600" />,
  update: <Edit className="w-4 h-4 text-amber-600" />,
  delete: <Trash className="w-4 h-4 text-red-600" />
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ user_id: '', object_type: '', action: '', start_date: '', end_date: '' });

  useEffect(() => {
    loadData();
  }, [activeTab, pagination.page, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'logs') {
        const data = await api.getAuditLogs({ page: pagination.page, limit: 20, ...filters });
        setLogs(data.data);
        setPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages, total: data.pagination.total });
      } else if (activeTab === 'stats') {
        const data = await api.getAuditStats();
        setStats(data);
      } else if (activeTab === 'users') {
        const data = await api.getUsers();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const formatDate = (date) => new Date(date).toLocaleString();

  const renderChanges = (changes) => {
    if (!changes) return <span className="text-surface-400">-</span>;
    let parsed = changes;
    if (typeof changes === 'string') {
      try { parsed = JSON.parse(changes); } catch { return <span className="text-surface-400">-</span>; }
    }
    return (
      <pre className="text-xs text-surface-600 bg-surface-50 p-2 rounded-lg overflow-x-auto max-w-md border border-surface-100">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  };

  const tabs = [
    { id: 'logs', label: 'Audit Logs', icon: FileText },
    { id: 'stats', label: 'Statistics', icon: Activity },
    { id: 'users', label: 'Users', icon: Users }
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-primary-100">
          <Shield className="w-6 h-6 text-primary-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-900">Admin Panel</h1>
          <p className="text-surface-500 text-sm">Monitor user activity and system logs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-surface-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPagination({ page: 1, totalPages: 1, total: 0 }); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'logs' && (
        <div className="card">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 p-6 border-b border-surface-100">
            <div>
              <label className="block text-xs text-surface-500 mb-1">Object Type</label>
              <select value={filters.object_type} onChange={(e) => handleFilterChange('object_type', e.target.value)} className="input py-1.5 text-sm w-32">
                <option value="">All</option>
                <option value="project">Project</option>
                <option value="mission">Mission</option>
                <option value="task">Task</option>
                <option value="comment">Comment</option>
                <option value="campaign">Campaign</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Action</label>
              <select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)} className="input py-1.5 text-sm w-28">
                <option value="">All</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Start Date</label>
              <input type="date" value={filters.start_date} onChange={(e) => handleFilterChange('start_date', e.target.value)} className="input py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">End Date</label>
              <input type="date" value={filters.end_date} onChange={(e) => handleFilterChange('end_date', e.target.value)} className="input py-1.5 text-sm" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-surface-400" />
              </div>
              <p className="text-surface-500">No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100 bg-surface-50">
                      <th className="text-left py-3 px-6 font-medium text-surface-600">Time</th>
                      <th className="text-left py-3 px-6 font-medium text-surface-600">User</th>
                      <th className="text-left py-3 px-6 font-medium text-surface-600">Action</th>
                      <th className="text-left py-3 px-6 font-medium text-surface-600">Object</th>
                      <th className="text-left py-3 px-6 font-medium text-surface-600">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2 text-surface-500">
                            <Clock className="w-4 h-4" />
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            <Avatar user={{ name: log.user_name, email: log.user_email }} size="sm" />
                            <div>
                              <p className="text-surface-900">{log.user_name || 'Unknown'}</p>
                              <p className="text-xs text-surface-500">{log.user_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            {actionIcons[log.action]}
                            <span className="text-surface-700 capitalize">{log.action}</span>
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <span className="badge badge-default capitalize">{log.object_type}</span>
                          <span className="text-xs text-surface-500 ml-2">#{log.object_id}</span>
                        </td>
                        <td className="py-3 px-6">{renderChanges(log.changes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-surface-100">
                <p className="text-sm text-surface-500">Showing {logs.length} of {pagination.total} logs</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page <= 1} className="icon-btn disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-surface-600">Page {pagination.page} of {pagination.totalPages}</span>
                  <button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page >= pagination.totalPages} className="icon-btn disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : stats && (
            <>
              {/* Top Users */}
              <div className="card p-6">
                <h3 className="font-semibold text-surface-900 mb-4">Most Active Users (Last 7 Days)</h3>
                <div className="space-y-2">
                  {stats.top_users?.map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-surface-400 w-6">#{index + 1}</span>
                        <Avatar user={user} size="md" />
                        <div>
                          <p className="font-medium text-surface-900 text-sm">{user.name}</p>
                          <p className="text-xs text-surface-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-surface-900">{user.action_count}</p>
                        <p className="text-xs text-surface-500">actions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions by Type */}
              <div className="card p-6">
                <h3 className="font-semibold text-surface-900 mb-4">Actions by Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {stats.by_action?.map((item) => (
                    <div key={`${item.action}-${item.object_type}`} className="bg-surface-50 p-4 rounded-lg border border-surface-100">
                      <div className="flex items-center gap-2 mb-2">
                        {actionIcons[item.action]}
                        <span className="text-sm text-surface-700 capitalize">{item.action}</span>
                      </div>
                      <p className="text-xs text-surface-500 capitalize">{item.object_type}</p>
                      <p className="text-xl font-bold text-surface-900 mt-1">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Activity */}
              <div className="card p-6">
                <h3 className="font-semibold text-surface-900 mb-4">Daily Activity (Last 7 Days)</h3>
                <div className="flex items-end gap-2 h-32">
                  {stats.daily_activity?.map((day) => {
                    const maxCount = Math.max(...stats.daily_activity.map(d => d.count));
                    const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-primary-600 rounded-t-md transition-all duration-300" style={{ height: `${height}%`, minHeight: '4px' }} />
                        <span className="text-xs text-surface-500">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="text-xs font-medium text-surface-700">{day.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <div className="px-6 py-4 border-b border-surface-100">
            <h3 className="font-semibold text-surface-900">All Users</h3>
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
                    <th className="text-left py-3 px-6 font-medium text-surface-600">Role</th>
                    <th className="text-left py-3 px-6 font-medium text-surface-600">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size="md" />
                          <span className="text-surface-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-surface-600">{user.email}</td>
                      <td className="py-3 px-6">
                        <span className={`badge capitalize ${user.role === 'admin' ? 'badge-warning' : 'badge-default'}`}>{user.role}</span>
                      </td>
                      <td className="py-3 px-6 text-surface-600">{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
