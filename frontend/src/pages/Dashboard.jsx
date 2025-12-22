import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  FolderKanban,
  CheckSquare,
  Megaphone,
  ArrowRight,
  MoreVertical,
  Trash2,
  Edit2,
  X
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setSaving(true);
    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, {
          name: projectName,
          description: projectDescription
        });
      } else {
        await api.createProject(projectName, projectDescription);
      }
      loadProjects();
      closeModal();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setShowCreateModal(true);
    setMenuOpen(null);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingProject(null);
    setProjectName('');
    setProjectDescription('');
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-surface-500 mt-1">
            Manage your projects and collaborate with your team
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16 px-8">
          <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-surface-400" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 mb-2">No projects yet</h3>
          <p className="text-surface-500 mb-6 max-w-sm mx-auto">
            Create your first project to start organizing tasks and collaborating with your team.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="card-hover p-5 animate-slide-up group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900 group-hover:text-primary-700 transition-colors">
                      {project.name}
                    </h3>
                    <span className="text-xs text-surface-500 capitalize">
                      {project.member_role}
                    </span>
                  </div>
                </div>

                {project.member_role === 'owner' && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpen(menuOpen === project.id ? null : project.id);
                      }}
                      className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpen === project.id && (
                      <div className="absolute right-0 mt-1 w-36 dropdown z-10 animate-scale-in">
                        <button
                          onClick={() => openEditModal(project)}
                          className="dropdown-item"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteProject(project.id);
                            setMenuOpen(null);
                          }}
                          className="dropdown-item-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {project.description && (
                <p className="text-sm text-surface-500 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-surface-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  <span>{project.task_count || 0} tasks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4" />
                  <span>{project.mission_count || 0} missions</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-surface-100">
                <Link
                  to={`/project/${project.id}/ads`}
                  className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
                >
                  <Megaphone className="w-4 h-4" />
                  Ads
                </Link>
                <Link
                  to={`/project/${project.id}`}
                  className="flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-800 font-medium transition-colors"
                >
                  Open
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-surface-900">
                {editingProject ? 'Edit Project' : 'Create Project'}
              </h2>
              <button onClick={closeModal} className="icon-btn">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="label">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="input"
                  placeholder="My Awesome Project"
                  required
                />
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="input min-h-24 resize-none"
                  placeholder="What is this project about?"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !projectName.trim()}
                  className="flex-1 btn-primary"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : editingProject ? (
                    'Save Changes'
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
};

export default Dashboard;
