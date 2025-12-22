import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Avatar from './Avatar';
import { X, UserPlus, Search, Crown, Trash2 } from 'lucide-react';

const MemberManager = ({ projectId, members, isOwner, onClose, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setSearching(true);
    try {
      const data = await api.getUsers(searchQuery);
      const memberIds = members.map(m => m.id);
      setSearchResults(data.users.filter(u => !memberIds.includes(u.id)));
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    setAdding(userId);
    try {
      await api.addProjectMember(projectId, userId);
      onUpdate();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setAdding(null);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the project?')) return;

    try {
      await api.removeProjectMember(projectId, userId);
      onUpdate();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">Project Members</h2>
          <button onClick={onClose} className="icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Add member (only for owners) */}
          {isOwner && (
            <div className="mb-6">
              <label className="label flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                Add Member
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10 text-sm"
                  placeholder="Search by name or email..."
                />
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mt-2 dropdown max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between px-4 py-2 hover:bg-surface-50">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="sm" />
                        <div>
                          <p className="text-sm text-surface-900">{user.name}</p>
                          <p className="text-xs text-surface-500">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user.id)}
                        disabled={adding === user.id}
                        className="text-sm text-primary-700 hover:text-primary-800 font-medium disabled:opacity-50"
                      >
                        {adding === user.id ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searching && (
                <div className="mt-2 text-center py-4">
                  <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                </div>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="mt-2 text-sm text-surface-500 text-center py-4">No users found</p>
              )}
            </div>
          )}

          {/* Members list */}
          <div>
            <h3 className="label">Members ({members.length})</h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg border border-surface-100">
                  <div className="flex items-center gap-3">
                    <Avatar user={member} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-surface-900">{member.name}</p>
                        {member.role === 'owner' && (
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-surface-500">{member.email}</p>
                    </div>
                  </div>

                  {isOwner && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="icon-btn text-surface-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberManager;
