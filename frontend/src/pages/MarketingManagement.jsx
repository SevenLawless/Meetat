import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react';

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const CardModal = ({ mode, existingCards, card, onClose, onSave }) => {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() => ({
    name: card?.name || '',
    last4: card?.last4 || '',
    dotation_limit: card?.dotation_limit ?? '',
    cold_balance: card?.cold_balance ?? 0,
    real_balance: card?.real_balance ?? 0
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const nameTaken = useMemo(() => {
    const normalized = form.name.trim().toLowerCase();
    if (!normalized) return false;
    return existingCards.some((c) => c.name.trim().toLowerCase() === normalized && c.id !== card?.id);
  }, [existingCards, form.name, card?.id]);

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (nameTaken) return 'Name must be unique';
    if (!/^\d{4}$/.test(form.last4.trim())) return 'Last 4 digits must be exactly 4 digits';

    const dotation = numberOrZero(form.dotation_limit);
    if (dotation < 0) return 'Dotation must be a positive number';

    if (!isEdit) {
      const cold = numberOrZero(form.cold_balance);
      const real = numberOrZero(form.real_balance);
      if (cold < 0 || real < 0) return 'Balances must be positive numbers';
    }

    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateMarketingCard(card.id, {
          name: form.name.trim(),
          last4: form.last4.trim(),
          dotation_limit: numberOrZero(form.dotation_limit)
        });
      } else {
        await api.createMarketingCard({
          name: form.name.trim(),
          last4: form.last4.trim(),
          dotation_limit: numberOrZero(form.dotation_limit),
          cold_balance: numberOrZero(form.cold_balance),
          real_balance: numberOrZero(form.real_balance)
        });
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-900">
            {isEdit ? 'Edit Card' : 'Add Card'}
          </h2>
          <button onClick={onClose} className="icon-btn" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className={nameTaken ? 'input-error' : 'input'}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Visa Main"
              autoFocus
            />
            {nameTaken && <p className="text-xs text-red-600 mt-1">Name already exists.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Last 4 digits</label>
              <input
                className="input"
                value={form.last4}
                onChange={(e) => setForm({ ...form, last4: e.target.value })}
                placeholder="1234"
                maxLength={4}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label">Dotation (limit)</label>
              <input
                className="input"
                value={form.dotation_limit}
                onChange={(e) => setForm({ ...form, dotation_limit: e.target.value })}
                placeholder="0"
                inputMode="decimal"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cold balance</label>
                <input
                  className="input"
                  value={form.cold_balance}
                  onChange={(e) => setForm({ ...form, cold_balance: e.target.value })}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="label">Real balance</label>
                <input
                  className="input"
                  value={form.real_balance}
                  onChange={(e) => setForm({ ...form, real_balance: e.target.value })}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdAccountModal = ({ mode, cards, account, onClose, onSave }) => {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() => ({
    name: account?.name || '',
    linked_card_ids: account?.linked_card_ids || []
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    return null;
  };

  const toggleLinkedCard = (cardId) => {
    const exists = form.linked_card_ids.includes(cardId);
    setForm({
      ...form,
      linked_card_ids: exists
        ? form.linked_card_ids.filter((id) => id !== cardId)
        : [...form.linked_card_ids, cardId]
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await api.updateMarketingAdAccount(account.id, {
          name: form.name.trim(),
          linked_card_ids: form.linked_card_ids
        });
      } else {
        await api.createMarketingAdAccount({
          name: form.name.trim(),
          linked_card_ids: form.linked_card_ids
        });
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save ad account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-900">
            {isEdit ? 'Edit Ad Account' : 'Add Ad Account'}
          </h2>
          <button onClick={onClose} className="icon-btn" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Facebook - US"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Linked cards</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleLinkedCard(c.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                    form.linked_card_ids.includes(c.id)
                      ? 'bg-primary-50 border-primary-200 text-primary-900'
                      : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-50'
                  }`}
                >
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  <span className="text-xs text-surface-500">{c.last4 ? `•••• ${c.last4}` : ''}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TransactionModal = ({ cards, adAccounts, cardId, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [kind, setKind] = useState('revenue_cold_to_real');
  const [form, setForm] = useState(() => ({
    amount: '',
    source_card_id: '',
    ad_account_id: '',
    note: ''
  }));

  const amount = numberOrZero(form.amount);

  const validate = () => {
    if (amount <= 0) return 'Amount must be greater than 0';
    if (kind === 'revenue_from_card_cold') {
      const source = Number(form.source_card_id);
      if (!source) return 'Source card is required';
      if (source === cardId) return 'Source card must be different';
    }
    if (kind === 'expense_spend_ad') {
      const aa = Number(form.ad_account_id);
      if (!aa) return 'Ad account is required';
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (kind === 'revenue_cold_to_real') {
        await api.createMarketingRevenueColdToReal({ card_id: cardId, amount, note: form.note.trim() || null });
      } else if (kind === 'revenue_from_card_cold') {
        await api.createMarketingRevenueFromOtherCardCold({
          source_card_id: Number(form.source_card_id),
          target_card_id: cardId,
          amount,
          note: form.note.trim() || null
        });
      } else if (kind === 'expense_spend_ad') {
        await api.createMarketingExpenseSpend({
          card_id: cardId,
          ad_account_id: Number(form.ad_account_id),
          amount,
          note: form.note.trim() || null
        });
      } else if (kind === 'expense_real_to_cold') {
        await api.createMarketingExpenseRealToCold({ card_id: cardId, amount, note: form.note.trim() || null });
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to create transaction');
    } finally {
      setSaving(false);
    }
  };

  const sourceCards = cards.filter((c) => c.id !== cardId);

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-900">New Transaction</h2>
          <button onClick={onClose} className="icon-btn" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="revenue_cold_to_real">Revenue: Cold → Real (same card)</option>
              <option value="revenue_from_card_cold">Revenue: Other card cold → This card real</option>
              <option value="expense_spend_ad">Expense: Spend on ad account</option>
              <option value="expense_real_to_cold">Expense: Real → Cold (refund)</option>
            </select>
          </div>

          {kind === 'revenue_from_card_cold' && (
            <div>
              <label className="label">Source card</label>
              <select
                className="input"
                value={form.source_card_id}
                onChange={(e) => setForm({ ...form, source_card_id: e.target.value })}
              >
                <option value="">Select...</option>
                {sourceCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.last4 ? `•••• ${c.last4}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {kind === 'expense_spend_ad' && (
            <div>
              <label className="label">Ad account</label>
              <select
                className="input"
                value={form.ad_account_id}
                onChange={(e) => setForm({ ...form, ad_account_id: e.target.value })}
              >
                <option value="">Select...</option>
                {adAccounts.map((aa) => (
                  <option key={aa.id} value={aa.id}>
                    {aa.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Amount</label>
            <input
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              inputMode="decimal"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Note</label>
            <input
              className="input"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Optional"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MarketingManagement = () => {
  const { toasts, success, error: toastError, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [transactionsByCard, setTransactionsByCard] = useState({});
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const [showAdAccountModal, setShowAdAccountModal] = useState(false);
  const [editingAdAccount, setEditingAdAccount] = useState(null);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [activeTransactionCardId, setActiveTransactionCardId] = useState(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await api.getMarketingOverview();
      setOverview(data);
    } catch (err) {
      toastError(err.message || 'Failed to load marketing overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const cards = overview?.cards || [];
  const adAccounts = overview?.ad_accounts || [];
  const summary = overview?.summary;

  const sortedCards = useMemo(() => {
    const copy = [...cards];
    const factor = sort.dir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      const av = a?.[sort.key];
      const bv = b?.[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av ?? '').localeCompare(String(bv ?? '')) * factor;
    });
    return copy;
  }, [cards, sort]);

  const openCreateCard = () => {
    setEditingCard(null);
    setShowCardModal(true);
  };

  const openEditCard = (card) => {
    setEditingCard(card);
    setShowCardModal(true);
  };

  const deleteCard = async (card) => {
    if (!confirm(`Delete card "${card.name}"? This will also delete its transactions.`)) return;
    try {
      await api.deleteMarketingCard(card.id);
      success('Card deleted');
      await loadOverview();
      setExpandedCardId((prev) => (prev === card.id ? null : prev));
    } catch (err) {
      toastError(err.message || 'Failed to delete card');
    }
  };

  const openCreateAdAccount = () => {
    setEditingAdAccount(null);
    setShowAdAccountModal(true);
  };

  const openEditAdAccount = (account) => {
    setEditingAdAccount(account);
    setShowAdAccountModal(true);
  };

  const deleteAdAccount = async (account) => {
    if (!confirm(`Delete ad account "${account.name}"?`)) return;
    try {
      await api.deleteMarketingAdAccount(account.id);
      success('Ad account deleted');
      await loadOverview();
    } catch (err) {
      toastError(err.message || 'Failed to delete ad account');
    }
  };

  const loadTransactions = async (cardId) => {
    setTransactionsLoading(true);
    try {
      const data = await api.getMarketingCardTransactions(cardId);
      setTransactionsByCard((prev) => ({ ...prev, [cardId]: data.transactions }));
    } catch (err) {
      toastError(err.message || 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const toggleCardExpand = async (cardId) => {
    if (expandedCardId === cardId) {
      setExpandedCardId(null);
      return;
    }
    setExpandedCardId(cardId);
    if (!transactionsByCard[cardId]) {
      await loadTransactions(cardId);
    }
  };

  const openTransactionModal = (cardId) => {
    setActiveTransactionCardId(cardId);
    setShowTransactionModal(true);
  };

  const deleteTransaction = async (tx) => {
    if (!confirm('Delete this transaction? This will reverse its balance effects.')) return;
    try {
      await api.deleteMarketingTransaction(tx.id);
      success('Transaction deleted');
      await loadOverview();
      if (expandedCardId) await loadTransactions(expandedCardId);
    } catch (err) {
      toastError(err.message || 'Failed to delete transaction');
    }
  };

  const txColumns = useMemo(
    () => [
      { headerName: 'Date', field: 'created_at', valueFormatter: (p) => new Date(p.value).toLocaleString(), minWidth: 170 },
      { headerName: 'Type', field: 'type', minWidth: 110 },
      { headerName: 'Kind', field: 'kind', minWidth: 170 },
      { headerName: 'Amount', field: 'amount', valueFormatter: (p) => formatMoney(p.value), minWidth: 130 },
      { headerName: 'Ad Account', field: 'ad_account_name', minWidth: 180 },
      { headerName: 'Source Card', field: 'source_card_name', minWidth: 180 },
      { headerName: 'Note', field: 'note', flex: 1, minWidth: 220 },
      {
        headerName: '',
        field: 'id',
        minWidth: 90,
        cellRenderer: (p) => (
          <button
            className="btn-danger btn-sm"
            onClick={() => deleteTransaction(p.data)}
            type="button"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )
      }
    ],
    [expandedCardId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-surface-900">Marketing Management</h1>
            <p className="text-surface-500 text-sm">Cards, dotation, balances, and ad account spend</p>
          </div>
          <button className="btn-secondary" onClick={loadOverview} type="button">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="card p-4">
              <p className="text-xs text-surface-500 mb-1">Total Cold</p>
              <p className="text-lg font-semibold text-surface-900">{formatMoney(summary.total_cold_balance)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-surface-500 mb-1">Total Real</p>
              <p className="text-lg font-semibold text-surface-900">{formatMoney(summary.total_real_balance)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-surface-500 mb-1">Total Balance</p>
              <p className="text-lg font-semibold text-surface-900">{formatMoney(summary.total_balance)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-surface-500 mb-1">Total Dotation</p>
              <p className="text-lg font-semibold text-surface-900">{formatMoney(summary.total_dotation_limit)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-surface-500 mb-1">Dotation Left</p>
              <p className="text-lg font-semibold text-surface-900">{formatMoney(summary.total_dotation_left)}</p>
            </div>
          </div>
        )}

        <div className="card p-5 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-surface-900">Credit Cards</h2>
              <p className="text-sm text-surface-500">Click a card to view its transactions</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="flex gap-2">
                <select
                  className="input !py-2.5"
                  value={sort.key}
                  onChange={(e) => setSort({ ...sort, key: e.target.value })}
                >
                  <option value="name">Sort: Name</option>
                  <option value="dotation_limit">Sort: Dotation</option>
                  <option value="dotation_left">Sort: Dotation left</option>
                  <option value="total_balance">Sort: Total balance</option>
                </select>
                <select
                  className="input !py-2.5"
                  value={sort.dir}
                  onChange={(e) => setSort({ ...sort, dir: e.target.value })}
                >
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
              <button className="btn-primary" onClick={openCreateCard} type="button">
                <Plus className="w-4 h-4" />
                Add Card
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {sortedCards.length === 0 ? (
              <div className="text-sm text-surface-500 py-8 text-center bg-surface-50 rounded-lg border border-surface-100">
                No cards yet.
              </div>
            ) : (
              sortedCards.map((c) => {
                const expanded = expandedCardId === c.id;
                const transactions = transactionsByCard[c.id] || [];
                return (
                  <div key={c.id} className="border border-surface-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCardExpand(c.id)}
                      className="w-full text-left bg-white hover:bg-surface-50 transition-colors"
                    >
                      <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-surface-900">{c.name}</h3>
                              {c.last4 && <span className="badge badge-default">•••• {c.last4}</span>}
                            </div>
                            <p className="text-xs text-surface-500 mt-1">
                              Dotation left: {formatMoney(c.dotation_left)} / {formatMoney(c.dotation_limit)}
                            </p>
                          </div>
                          <div className="lg:hidden">{expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6">
                          <div>
                            <p className="text-[11px] text-surface-500">Cold</p>
                            <p className="text-sm font-medium text-surface-900">{formatMoney(c.cold_balance)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-surface-500">Real</p>
                            <p className="text-sm font-medium text-surface-900">{formatMoney(c.real_balance)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-surface-500">Total</p>
                            <p className="text-sm font-medium text-surface-900">{formatMoney(c.total_balance)}</p>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCard(c);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-danger btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCard(c);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                            <div className="hidden lg:block ml-2">
                              {expanded ? <ChevronUp className="w-5 h-5 text-surface-500" /> : <ChevronDown className="w-5 h-5 text-surface-500" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="bg-surface-50 border-t border-surface-200 p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <h4 className="font-semibold text-surface-900">Transactions</h4>
                            <p className="text-xs text-surface-500">Revenue/expense history for this card</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="btn-secondary btn-sm"
                              type="button"
                              onClick={() => loadTransactions(c.id)}
                              disabled={transactionsLoading}
                            >
                              <RefreshCcw className="w-4 h-4" />
                              Reload
                            </button>
                            <button
                              className="btn-primary btn-sm"
                              type="button"
                              onClick={() => openTransactionModal(c.id)}
                            >
                              <Plus className="w-4 h-4" />
                              New
                            </button>
                          </div>
                        </div>

                        <div className="ag-theme-quartz" style={{ height: 320, width: '100%' }}>
                          <AgGridReact
                            rowData={transactions}
                            columnDefs={txColumns}
                            defaultColDef={{ sortable: true, filter: true, resizable: true }}
                            animateRows
                            pagination
                            paginationPageSize={25}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-surface-900">Ad Accounts</h2>
              <p className="text-sm text-surface-500">Transactions can reference ad accounts</p>
            </div>
            <button className="btn-primary" onClick={openCreateAdAccount} type="button">
              <Plus className="w-4 h-4" />
              Add Ad Account
            </button>
          </div>

          {adAccounts.length === 0 ? (
            <div className="text-sm text-surface-500 py-8 text-center bg-surface-50 rounded-lg border border-surface-100">
              No ad accounts yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs text-surface-500 border-b border-surface-200">
                    <th className="text-left py-2 pr-4 font-medium">Name</th>
                    <th className="text-left py-2 pr-4 font-medium">Linked Cards</th>
                    <th className="text-right py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adAccounts.map((aa) => (
                    <tr key={aa.id} className="border-b border-surface-100">
                      <td className="py-3 pr-4 text-sm font-medium text-surface-900">{aa.name}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          {(aa.linked_cards || []).length === 0 ? (
                            <span className="text-sm text-surface-400">None</span>
                          ) : (
                            aa.linked_cards.map((c) => (
                              <span key={c.id} className="badge badge-default">
                                {c.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="btn-secondary btn-sm" type="button" onClick={() => openEditAdAccount(aa)}>
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button className="btn-danger btn-sm" type="button" onClick={() => deleteAdAccount(aa)}>
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCardModal && (
        <CardModal
          mode={editingCard ? 'edit' : 'create'}
          existingCards={cards}
          card={editingCard}
          onClose={() => setShowCardModal(false)}
          onSave={async () => {
            setShowCardModal(false);
            success('Saved');
            await loadOverview();
          }}
        />
      )}

      {showAdAccountModal && (
        <AdAccountModal
          mode={editingAdAccount ? 'edit' : 'create'}
          cards={cards}
          account={editingAdAccount}
          onClose={() => setShowAdAccountModal(false)}
          onSave={async () => {
            setShowAdAccountModal(false);
            success('Saved');
            await loadOverview();
          }}
        />
      )}

      {showTransactionModal && activeTransactionCardId && (
        <TransactionModal
          cards={cards}
          adAccounts={adAccounts}
          cardId={activeTransactionCardId}
          onClose={() => {
            setShowTransactionModal(false);
            setActiveTransactionCardId(null);
          }}
          onSave={async () => {
            setShowTransactionModal(false);
            setActiveTransactionCardId(null);
            success('Transaction created');
            await loadOverview();
            if (expandedCardId) await loadTransactions(expandedCardId);
          }}
        />
      )}
    </>
  );
};

export default MarketingManagement;

