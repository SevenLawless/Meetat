import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import TaskViewModal from '../components/TaskViewModal';
import TaskModal from '../components/TaskModal';
import MemberManager from '../components/MemberManager';
import Avatar from '../components/Avatar';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  Clock,
  Megaphone,
  X,
  MessageSquare,
  Tag as TagIcon,
  CheckCircle2,
  Circle,
  AlertCircle,
  Paperclip,
  Calendar,
  FileText
} from 'lucide-react';

const statusConfig = {
  'todo': { label: 'To Do', class: 'status-todo', icon: Circle, color: 'bg-surface-100 text-surface-700 border-surface-200' },
  'in-progress': { label: 'In Progress', class: 'status-in-progress', icon: AlertCircle, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'done': { label: 'Done', class: 'status-done', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

const priorityConfig = {
  'low': { label: 'Low', class: 'priority-low', color: 'text-surface-500', dotColor: 'bg-surface-400' },
  'medium': { label: 'Medium', class: 'priority-medium', color: 'text-amber-600', dotColor: 'bg-amber-500' },
  'high': { label: 'High', class: 'priority-high', color: 'text-red-600', dotColor: 'bg-red-500' }
};

const ProjectPage = () => {
  const { projectId } = useParams();
  const { subscribeToProject, unsubscribeFromProject, addListener, removeListener } = useWebSocket();
  
  const [project, setProject] = useState(null);
  const [missions, setMissions] = useState([]);
  const [tasksByMission, setTasksByMission] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [newTaskMission, setNewTaskMission] = useState(null);
  
  // Mission states
  const [newMissionName, setNewMissionName] = useState('');
  const [addingMission, setAddingMission] = useState(false);
  const [showNewMission, setShowNewMission] = useState(false);
  const [missionMenu, setMissionMenu] = useState(null);
  const [editingMission, setEditingMission] = useState(null);

  const loadProject = async () => {
    try {
      const [projectData, missionsData] = await Promise.all([
        api.getProject(projectId),
        api.getMissions(projectId)
      ]);
      
      setProject(projectData.project);
      setMissions(missionsData.missions);

      const tasksPromises = missionsData.missions.map(m => api.getTasks(m.id));
      const tasksResults = await Promise.all(tasksPromises);
      
      const taskMap = {};
      missionsData.missions.forEach((mission, idx) => {
        taskMap[mission.id] = tasksResults[idx].tasks;
      });
      setTasksByMission(taskMap);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = useCallback(async () => {
    if (missions.length === 0) return;
    const tasksPromises = missions.map(m => api.getTasks(m.id));
    const tasksResults = await Promise.all(tasksPromises);
    
    const taskMap = {};
    missions.forEach((mission, idx) => {
      taskMap[mission.id] = tasksResults[idx].tasks;
    });
    setTasksByMission(taskMap);
  }, [missions]);

  const handleWebSocketMessage = useCallback((type, message) => {
    switch (type) {
      case 'task_created':
        loadTasks();
        break;
      case 'task_updated':
        // Merge updated task into state
        if (message.task && message.mission_id) {
          setTasksByMission(prev => {
            const missionTasks = prev[message.mission_id] || [];
            const taskIndex = missionTasks.findIndex(t => t.id === message.task.id);
            
            if (taskIndex >= 0) {
              // Update existing task
              const updatedTasks = [...missionTasks];
              updatedTasks[taskIndex] = message.task;
              return { ...prev, [message.mission_id]: updatedTasks };
            } else {
              // Task might be in a different mission now, reload to be safe
              loadTasks();
            }
            return prev;
          });
        } else {
          // Fallback to reload if data structure is unexpected
          loadTasks();
        }
        break;
      case 'task_deleted':
        setTasksByMission(prev => {
          const newTasks = {};
          for (const [missionId, tasks] of Object.entries(prev)) {
            newTasks[missionId] = tasks.filter(t => t.id !== message.taskId);
          }
          return newTasks;
        });
        break;
    }
  }, [loadTasks]);

  useEffect(() => {
    loadProject();
    subscribeToProject(parseInt(projectId));

    const listenerId = `project-${projectId}`;
    addListener(listenerId, handleWebSocketMessage);

    return () => {
      unsubscribeFromProject(parseInt(projectId));
      removeListener(listenerId);
    };
  }, [projectId, handleWebSocketMessage, subscribeToProject, unsubscribeFromProject, addListener, removeListener]);

  const handleCreateMission = async (e) => {
    e.preventDefault();
    if (!newMissionName.trim()) return;

    setAddingMission(true);
    try {
      const newMission = await api.createMission(projectId, newMissionName);
      setMissions([...missions, newMission]);
      setTasksByMission({ ...tasksByMission, [newMission.id]: [] });
      setNewMissionName('');
      setShowNewMission(false);
    } catch (error) {
      console.error('Failed to create mission:', error);
    } finally {
      setAddingMission(false);
    }
  };

  const handleDeleteMission = async (missionId) => {
    if (!confirm('Delete this mission and all its tasks?')) return;

    try {
      await api.deleteMission(missionId);
      setMissions(missions.filter(m => m.id !== missionId));
      const newTasks = { ...tasksByMission };
      delete newTasks[missionId];
      setTasksByMission(newTasks);
    } catch (error) {
      console.error('Failed to delete mission:', error);
    }
    setMissionMenu(null);
  };

  const handleUpdateMission = async (missionId, name) => {
    try {
      await api.updateMission(missionId, { name });
      setMissions(missions.map(m => m.id === missionId ? { ...m, name } : m));
      setEditingMission(null);
    } catch (error) {
      console.error('Failed to update mission:', error);
    }
  };

  const handleTaskClick = async (taskId) => {
    try {
      const data = await api.getTask(taskId);
      setViewTask(data.task);
    } catch (error) {
      console.error('Failed to load task:', error);
    }
  };

  const handleEditFromView = () => {
    setEditTask(viewTask);
    setViewTask(null);
    setShowEditModal(true);
  };

  const handleCreateTask = (missionId) => {
    setNewTaskMission(missionId);
    setEditTask(null);
    setShowEditModal(true);
  };

  const handleTaskSaved = () => {
    loadTasks();
    setShowEditModal(false);
    setEditTask(null);
    setNewTaskMission(null);
  };

  const handleTaskDeleted = () => {
    loadTasks();
    setViewTask(null);
  };

  const handleStatusChange = async (taskId, newStatus, missionId) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      setTasksByMission(prev => ({
        ...prev,
        [missionId]: prev[missionId].map(t =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      }));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-surface-500">Project not found</p>
        <Link to="/projects" className="text-primary-700 hover:text-primary-800 mt-2 inline-block font-medium">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/projects" className="icon-btn">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{project.name}</h1>
            {project.description && (
              <p className="text-surface-500 text-sm mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/project/${projectId}/ads`} className="btn-secondary btn-sm">
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline">Ads</span>
          </Link>
          <button onClick={() => setShowMemberManager(true)} className="btn-secondary btn-sm">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Members</span>
            <span className="text-xs bg-surface-200 px-1.5 py-0.5 rounded-full ml-1">
              {project.members?.length || 0}
            </span>
          </button>
          <button onClick={() => setShowNewMission(true)} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Mission</span>
          </button>
        </div>
      </div>

      {/* Vertical List Layout - Each mission in a row */}
      <div className="space-y-8">
        {missions.map((mission) => {
          const tasks = tasksByMission[mission.id] || [];
          const completedCount = tasks.filter(t => t.status === 'done').length;
          const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
          const todoCount = tasks.filter(t => t.status === 'todo').length;

          return (
            <div key={mission.id} className="card overflow-hidden bg-surface-100">
              {/* Mission Header */}
              <div className="px-6 py-5 border-b border-surface-200 bg-gradient-to-r from-surface-200 via-surface-100 to-surface-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4 flex-1">
                    {editingMission === mission.id ? (
                      <input
                        type="text"
                        defaultValue={mission.name}
                        autoFocus
                        className="flex-1 bg-transparent text-surface-900 font-bold text-xl focus:outline-none border-b-2 border-primary-500"
                        onBlur={(e) => handleUpdateMission(mission.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateMission(mission.id, e.target.value);
                          if (e.key === 'Escape') setEditingMission(null);
                        }}
                      />
                    ) : (
                      <h2 className="font-bold text-xl text-surface-900">{mission.name}</h2>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-surface-500">Total:</span>
                        <span className="font-semibold text-surface-900">{tasks.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Circle className="w-4 h-4 text-surface-400" />
                        <span className="text-surface-600">{todoCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-surface-600">{inProgressCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-surface-600">{completedCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCreateTask(mission.id)}
                      className="btn-primary btn-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Task
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMissionMenu(missionMenu === mission.id ? null : mission.id)}
                        className="icon-btn p-2"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {missionMenu === mission.id && (
                        <div className="absolute right-0 mt-1 w-40 dropdown z-10 animate-scale-in">
                          <button
                            onClick={() => {
                              setEditingMission(mission.id);
                              setMissionMenu(null);
                            }}
                            className="dropdown-item"
                          >
                            <Edit2 className="w-4 h-4" />
                            Rename Mission
                          </button>
                          <button
                            onClick={() => handleDeleteMission(mission.id)}
                            className="dropdown-item-danger"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Mission
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks Grid - Full width with details */}
              <div className="p-6">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-surface-200 rounded-xl bg-surface-200/50">
                    <FileText className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                    <p className="text-surface-500 font-medium mb-2">No tasks yet</p>
                    <p className="text-sm text-surface-400 mb-4">Get started by creating your first task</p>
                    <button
                      onClick={() => handleCreateTask(mission.id)}
                      className="btn-primary btn-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Task
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tasks.map((task) => {
                      const StatusIcon = statusConfig[task.status]?.icon || Circle;
                      const statusInfo = statusConfig[task.status];
                      const priorityInfo = priorityConfig[task.priority];
                      const overdue = isOverdue(task.due_date);

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task.id)}
                          className="p-5 bg-surface-100 border-2 border-surface-200 rounded-xl cursor-pointer hover:border-primary-400 hover:shadow-medium transition-all duration-200 group"
                        >
                          {/* Header: Title, Priority, Assigned Users */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base text-surface-900 leading-snug group-hover:text-primary-700 transition-colors mb-2">
                                {task.title}
                              </h3>
                              {/* Assigned Users - Prominent at top */}
                              {task.assigned_users && task.assigned_users.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Users className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {task.assigned_users.map((user, idx) => (
                                      <div
                                        key={user.id || idx}
                                        className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-surface-200 shadow-sm hover:border-primary-300 transition-colors"
                                        title={user.name}
                                      >
                                        <Avatar user={user} size="sm" className="border border-surface-200" />
                                        <span className="text-xs font-medium text-surface-700 whitespace-nowrap">
                                          {user.name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className={`w-2.5 h-2.5 rounded-full ${priorityInfo.dotColor}`} />
                              <span className={`badge text-[10px] ${priorityInfo.class}`}>
                                {priorityInfo.label}
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="text-sm text-surface-600 mb-4 line-clamp-3 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Status Badge */}
                          <div className="mb-4">
                            <select
                              value={task.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChange(task.id, e.target.value, mission.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-xs px-3 py-2 rounded-lg border font-medium w-full cursor-pointer focus:outline-none transition-colors ${statusInfo.color}`}
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="done">Done</option>
                            </select>
                          </div>


                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                              {task.tags.map((tag, idx) => (
                                <span key={idx} className="badge badge-primary text-xs flex items-center gap-1.5 px-2.5 py-1">
                                  <TagIcon className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Footer: Metadata */}
                          <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                            <div className="flex items-center gap-3">
                              {task.due_date && (
                                <div className={`flex items-center gap-1.5 text-xs font-medium ${overdue ? 'text-red-600' : 'text-surface-600'}`}>
                                  <Clock className={`w-3.5 h-3.5 ${overdue ? 'text-red-500' : 'text-surface-400'}`} />
                                  <span className={overdue ? 'font-semibold' : ''}>
                                    {formatDate(task.due_date)}
                                    {overdue && ' (Overdue)'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {task.comment_count > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-surface-500">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="font-medium">{task.comment_count}</span>
                                </div>
                              )}
                              {task.attachment_count > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-surface-500">
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span className="font-medium">{task.attachment_count}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* New Mission Form */}
        {showNewMission && (
          <div className="card p-6 animate-scale-in bg-surface-100">
            <form onSubmit={handleCreateMission}>
              <label className="label mb-2 text-base">Mission Name</label>
              <input
                type="text"
                value={newMissionName}
                onChange={(e) => setNewMissionName(e.target.value)}
                placeholder="Enter mission name..."
                className="input mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMission(false);
                    setNewMissionName('');
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMission || !newMissionName.trim()}
                  className="flex-1 btn-primary"
                >
                  {addingMission ? 'Creating...' : 'Create Mission'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Empty State */}
        {missions.length === 0 && !showNewMission && (
          <div className="card p-16 text-center bg-surface-100">
            <div className="w-20 h-20 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-surface-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">No missions yet</h3>
            <p className="text-surface-500 mb-8 max-w-md mx-auto">
              Create your first mission to start organizing tasks and tracking progress
            </p>
            <button
              onClick={() => setShowNewMission(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              Create First Mission
            </button>
          </div>
        )}
      </div>

      {/* Task View Modal */}
      {viewTask && (
        <TaskViewModal
          task={viewTask}
          onClose={() => setViewTask(null)}
          onEdit={handleEditFromView}
          onDelete={handleTaskDeleted}
          onUpdate={loadTasks}
        />
      )}

      {/* Task Edit Modal */}
      {showEditModal && (
        <TaskModal
          task={editTask}
          missionId={newTaskMission}
          projectId={parseInt(projectId)}
          members={project.members || []}
          onClose={() => {
            setShowEditModal(false);
            setEditTask(null);
            setNewTaskMission(null);
          }}
          onSave={handleTaskSaved}
        />
      )}

      {/* Member Manager */}
      {showMemberManager && (
        <MemberManager
          projectId={parseInt(projectId)}
          members={project.members || []}
          isOwner={project.member_role === 'owner'}
          onClose={() => setShowMemberManager(false)}
          onUpdate={() => loadProject()}
        />
      )}

      {/* Click outside to close menus */}
      {missionMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setMissionMenu(null)} />
      )}
    </div>
  );
};

export default ProjectPage;
