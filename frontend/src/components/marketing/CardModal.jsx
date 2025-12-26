import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CardModal = ({ card, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [dotation, setDotation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (card) {
      setName(card.name || '');
      setLastFourDigits(card.last_four_digits || '');
      setDotation(card.dotation || '');
    } else {
      setName('');
      setLastFourDigits('');
      setDotation('');
    }
    setError('');
  }, [card]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!lastFourDigits.trim() || !/^\d{4}$/.test(lastFourDigits)) {
      setError('Last four digits must be exactly 4 digits');
      return;
    }

    if (!dotation || parseFloat(dotation) <= 0) {
      setError('Dotation must be a positive number');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        last_four_digits: lastFourDigits.trim(),
        dotation: parseFloat(dotation),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-900">
            {card ? 'Edit Card' : 'Create Card'}
          </h2>
          <button onClick={onClose} className="icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Card Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Business Card"
              required
            />
          </div>

          <div>
            <label className="label">Last 4 Digits</label>
            <input
              type="text"
              value={lastFourDigits}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setLastFourDigits(value);
              }}
              className="input"
              placeholder="1234"
              maxLength={4}
              required
            />
          </div>

          <div>
            <label className="label">Dotation (Spending Limit)</label>
            <input
              type="number"
              value={dotation}
              onChange={(e) => setDotation(e.target.value)}
              className="input"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : card ? (
                'Save Changes'
              ) : (
                'Create Card'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardModal;

