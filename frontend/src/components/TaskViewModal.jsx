import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Avatar from './Avatar';
import {
  X,
  Calendar,
  Tag,
  Users,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  Edit2,
  Download,
  Clock
} from 'lucide-react';

const statusLabels = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done'
};

const statusClasses = {
  'todo': 'badge-default',
  'in-progress': 'badge-warning',
  'done': 'badge-success'
};

const priorityLabels = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High'
};

const priorityClasses = {
  'low': 'badge-default',
  'medium': 'badge-warning',
  'high': 'badge-danger'
};

const TaskViewModal = ({ task, onClose, onEdit, onDelete, onUpdate }) => {
  const [comments, setComments] = useState(task?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (task?.comments) {
      setComments(task.comments);
    }
  }, [task]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    setAddingComment(true);
    try {
      const comment = await api.addComment(task.id, newComment);
      setComments([...comments, comment]);
      setNewComment('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteTask(task.id);
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto animate-fade-in">
      <div className="card w-full max-w-2xl my-8 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">Task Details</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="btn-secondary btn-sm"
              title="Edit task"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="icon-btn text-red-500 hover:text-red-600 hover:bg-red-50"
              title="Delete task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="icon-btn">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Title */}
          <h1 className="text-xl font-semibold text-surface-900 mb-4">{task.title}</h1>

          {/* Status & Priority */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`badge ${statusClasses[task.status]}`}>
              {statusLabels[task.status]}
            </span>
            <span className={`badge ${priorityClasses[task.priority]}`}>
              {priorityLabels[task.priority]} Priority
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-surface-600 mb-2">Description</h3>
              <p className="text-surface-700 whitespace-pre-wrap bg-surface-50 p-4 rounded-lg border border-surface-100">
                {task.description}
              </p>
            </div>
          )}

          {/* Meta info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Due Date */}
            <div className="bg-surface-50 p-4 rounded-lg border border-surface-100">
              <div className="flex items-center gap-2 text-surface-500 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                Due Date
              </div>
              <p className="text-surface-900 font-medium">
                {task.due_date ? formatDate(task.due_date) : 'Not set'}
              </p>
            </div>

            {/* Created */}
            <div className="bg-surface-50 p-4 rounded-lg border border-surface-100">
              <div className="flex items-center gap-2 text-surface-500 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Created
              </div>
              <p className="text-surface-900 font-medium">
                {formatDate(task.created_at)}
              </p>
            </div>
          </div>

          {/* Assigned Users */}
          {task.assigned_users && task.assigned_users.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-surface-600 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assigned To
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.assigned_users.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 bg-surface-50 px-3 py-2 rounded-lg border border-surface-100">
                    <Avatar user={user} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-surface-900">{user.name}</p>
                      <p className="text-xs text-surface-500">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-surface-600 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, idx) => (
                  <span key={idx} className="badge badge-primary">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-surface-600 mb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments ({task.attachments.length})
              </h3>
              <div className="space-y-2">
                {task.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg border border-surface-100">
                    <div className="flex items-center gap-3">
                      <Paperclip className="w-4 h-4 text-surface-400" />
                      <div>
                        <p className="text-sm text-surface-900">{attachment.original_name}</p>
                        <p className="text-xs text-surface-500">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <a
                      href={`/uploads/${attachment.filename}`}
                      download={attachment.original_name}
                      className="btn-secondary btn-sm"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-medium text-surface-600 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </h3>

            {/* Comments list */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-surface-500 py-4 text-center bg-surface-50 rounded-lg">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-surface-50 rounded-lg border border-surface-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar user={{ name: comment.author_name }} size="sm" />
                        <span className="text-sm font-medium text-surface-900">{comment.author_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-surface-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="icon-btn p-1 text-surface-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-surface-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add comment form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input flex-1 text-sm"
                placeholder="Write a comment... (supports @mentions)"
                disabled={addingComment}
              />
              <button
                type="submit"
                disabled={addingComment || !newComment.trim()}
                className="btn-primary btn-sm"
              >
                {addingComment ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskViewModal;

