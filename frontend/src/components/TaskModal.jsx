import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Avatar from './Avatar';
import {
  X,
  Calendar,
  Tag,
  Users,
  Paperclip,
  Trash2,
  Plus,
  Download
} from 'lucide-react';

const TaskModal = ({ task, missionId, projectId, members, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    assigned_users: [],
    tags: []
  });
  const [attachments, setAttachments] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        assigned_users: task.assigned_users?.map(u => u.id) || [],
        tags: task.tags || []
      });
      setAttachments(task.attachments || []);
    } else {
      // Reset for new task
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: '',
        assigned_users: [],
        tags: []
      });
      setAttachments([]);
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      // Convert empty due_date to null
      const dataToSend = {
        ...formData,
        due_date: formData.due_date || null
      };

      if (task) {
        await api.updateTask(task.id, dataToSend);
      } else {
        await api.createTask({ mission_id: missionId, ...dataToSend });
      }
      onSave();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || formData.tags.includes(newTag.trim())) return;
    setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
    setNewTag('');
  };

  const handleRemoveTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleToggleAssign = (userId) => {
    const assigned = formData.assigned_users.includes(userId);
    setFormData({
      ...formData,
      assigned_users: assigned
        ? formData.assigned_users.filter(id => id !== userId)
        : [...formData.assigned_users, userId]
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    try {
      const attachment = await api.uploadAttachment(task.id, file);
      setAttachments([...attachments, attachment]);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await api.deleteAttachment(task.id, attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto animate-fade-in">
      <div className="card w-full max-w-2xl my-8 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Title */}
          <div className="mb-4">
            <label className="label">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="Task title..."
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-24 resize-none text-sm"
              placeholder="Add description... Use @username to mention someone"
            />
          </div>

          {/* Status, Priority, Due Date */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="label">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="mb-4">
            <label className="label flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Assigned To
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                className="input text-left flex items-center justify-between"
              >
                <span className="text-surface-500">
                  {formData.assigned_users.length === 0
                    ? 'Select members...'
                    : `${formData.assigned_users.length} member(s) assigned`}
                </span>
                <Plus className="w-4 h-4 text-surface-400" />
              </button>

              {showAssignDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 dropdown z-10 max-h-48 overflow-y-auto">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleToggleAssign(member.id)}
                      className={`dropdown-item ${formData.assigned_users.includes(member.id) ? 'bg-primary-50' : ''}`}
                    >
                      <Avatar user={member} size="sm" />
                      <span className="flex-1 text-left">{member.name}</span>
                      {formData.assigned_users.includes(member.id) && (
                        <span className="text-primary-600 font-medium">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formData.assigned_users.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.assigned_users.map((userId) => {
                  const member = members.find(m => m.id === userId);
                  if (!member) return null;
                  return (
                    <span key={userId} className="badge badge-primary flex items-center gap-1">
                      {member.name}
                      <button type="button" onClick={() => handleToggleAssign(userId)} className="hover:text-primary-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="label flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                className="input flex-1"
                placeholder="Add tag..."
              />
              <button type="button" onClick={handleAddTag} className="btn-secondary btn-sm">Add</button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <span key={tag} className="badge badge-default flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-surface-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Attachments (existing task only) */}
          {task && (
            <div className="mb-6">
              <label className="label flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                Attachments
              </label>
              
              <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
              <label htmlFor="file-upload" className="btn-secondary btn-sm inline-flex cursor-pointer">
                <Plus className="w-4 h-4" />
                Add File
              </label>

              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg border border-surface-100">
                      <div className="flex items-center gap-3">
                        <Paperclip className="w-4 h-4 text-surface-400" />
                        <div>
                          <p className="text-sm text-surface-900">{attachment.original_name}</p>
                          <p className="text-xs text-surface-500">{formatFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a href={`/uploads/${attachment.filename}`} download={attachment.original_name} className="icon-btn p-1">
                          <Download className="w-4 h-4" />
                        </a>
                        <button type="button" onClick={() => handleDeleteAttachment(attachment.id)} className="icon-btn p-1 text-red-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !formData.title.trim()} className="flex-1 btn-primary">
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : task ? (
                'Save Changes'
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>

      {showAssignDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setShowAssignDropdown(false)} />
      )}
    </div>
  );
};

export default TaskModal;
