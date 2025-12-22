import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  X,
  Plus,
  Trash2,
  Circle,
  CheckCircle2
} from 'lucide-react';

const PersonalTodoSidebar = ({ onClose }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const data = await api.getTodos();
      setTodos(data.todos);
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    setAdding(true);
    try {
      const data = await api.createTodo(newTodoTitle);
      setTodos([...todos, data]);
      setNewTodoTitle('');
    } catch (error) {
      console.error('Failed to add todo:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const data = await api.toggleTodo(id);
      setTodos(todos.map(t => t.id === id ? { ...t, completed: data.completed } : t));
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const completedCount = todos.filter(t => t.completed).length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-surface-200 z-50 animate-slide-up shadow-elevated flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <div>
            <h2 className="font-semibold text-surface-900">My To-Do List</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              {completedCount} of {todos.length} completed
            </p>
          </div>
          <button onClick={onClose} className="icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        {todos.length > 0 && (
          <div className="px-5 py-3 border-b border-surface-100">
            <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-500 ease-smooth"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Add todo form */}
        <form onSubmit={handleAddTodo} className="px-5 py-4 border-b border-surface-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Add a new todo..."
              className="input text-sm py-2"
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !newTodoTitle.trim()}
              className="btn-primary btn-sm px-3"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Todo list */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-surface-400" />
              </div>
              <p className="text-surface-600 text-sm font-medium">No todos yet</p>
              <p className="text-xs text-surface-400 mt-1">Add your first todo above</p>
            </div>
          ) : (
            <div className="space-y-1">
              {todos.map((todo, index) => (
                <div
                  key={todo.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg transition-all duration-150 ${
                    todo.completed
                      ? 'bg-surface-50'
                      : 'hover:bg-surface-50'
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <button
                    onClick={() => handleToggle(todo.id)}
                    className="flex-shrink-0 transition-transform active:scale-90"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-primary-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-surface-300 hover:text-surface-400" />
                    )}
                  </button>

                  <span
                    className={`flex-1 text-sm transition-all ${
                      todo.completed 
                        ? 'line-through text-surface-400' 
                        : 'text-surface-700'
                    }`}
                  >
                    {todo.title}
                  </span>

                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="flex-shrink-0 p-1 text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PersonalTodoSidebar;
