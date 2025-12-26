import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

const TransactionModal = ({ transaction, card, cards, adAccounts, onClose, onSave }) => {
  const [type, setType] = useState('revenue');
  const [subtype, setSubtype] = useState('cold_to_real');
  const [amount, setAmount] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [sourceCardId, setSourceCardId] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setType(transaction.type || 'revenue');
      setSubtype(transaction.subtype || 'cold_to_real');
      setAmount(transaction.amount || '');
      setAdAccountId(transaction.ad_account_id || '');
      setSourceCardId(transaction.source_card_id || '');
      setDescription(transaction.description || '');
      setTransactionDate(transaction.transaction_date || new Date().toISOString().split('T')[0]);
    } else {
      setType('revenue');
      setSubtype('cold_to_real');
      setAmount('');
      setAdAccountId('');
      setSourceCardId('');
      setDescription('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
    }
    setError('');
  }, [transaction]);

  // Update subtype when type changes
  useEffect(() => {
    if (type === 'revenue') {
      setSubtype('cold_to_real');
      setAdAccountId('');
    } else {
      setSubtype('ad_account_spend');
      setSourceCardId('');
    }
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    if (!transactionDate) {
      setError('Transaction date is required');
      return;
    }

    // Validate based on subtype
    if (type === 'expense' && subtype === 'ad_account_spend' && !adAccountId) {
      setError('Ad account is required for ad account spend');
      return;
    }

    if (type === 'revenue' && subtype === 'card_to_card' && !sourceCardId) {
      setError('Source card is required for card-to-card transfers');
      return;
    }

    setSaving(true);
    try {
      const data = {
        type,
        subtype,
        amount: parseFloat(amount),
        transaction_date: transactionDate,
        description: description.trim() || null,
        ad_account_id: adAccountId || null,
        source_card_id: sourceCardId || null,
      };

      if (transaction) {
        await api.updateTransaction(transaction.id, {
          description: data.description,
          transaction_date: data.transaction_date,
        });
      } else {
        await api.createTransaction(card.id, data);
      }
      
      onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const revenueSubtypes = [
    { value: 'cold_to_real', label: 'Cold → Real (Move from cold to real balance)' },
    { value: 'card_to_card', label: 'Card Transfer (From another card\'s cold balance)' },
  ];

  const expenseSubtypes = [
    { value: 'ad_account_spend', label: 'Ad Account Spend (Spend from real balance)' },
    { value: 'real_to_cold', label: 'Real → Cold (Move from real to cold balance)' },
  ];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-900">
            {transaction ? 'Edit Transaction' : 'Create Transaction'}
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

        {!transaction && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <strong>Card:</strong> {card?.name} (****{card?.last_four_digits})
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!transaction && (
            <>
              <div>
                <label className="label">Transaction Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="input"
                  required
                >
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <label className="label">Subtype</label>
                <select
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value)}
                  className="input"
                  required
                >
                  {type === 'revenue'
                    ? revenueSubtypes.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))
                    : expenseSubtypes.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
              disabled={!!transaction}
            />
            {transaction && (
              <p className="text-xs text-surface-500 mt-1">
                Amount cannot be changed after creation
              </p>
            )}
          </div>

          <div>
            <label className="label">Transaction Date</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="input"
              required
            />
          </div>

          {type === 'expense' && subtype === 'ad_account_spend' && !transaction && (
            <div>
              <label className="label">Ad Account</label>
              <select
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select an ad account</option>
                {adAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'revenue' && subtype === 'card_to_card' && !transaction && (
            <div>
              <label className="label">Source Card</label>
              <select
                value={sourceCardId}
                onChange={(e) => setSourceCardId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select a source card</option>
                {cards
                  .filter((c) => c.id !== card?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (****{c.last_four_digits})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-24 resize-none"
              placeholder="Add notes about this transaction..."
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
              ) : transaction ? (
                'Save Changes'
              ) : (
                'Create Transaction'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;

