import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const MarketingDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [searchDebounce, setSearchDebounce] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, [pagination.page, sortBy, sortOrder]);

  useEffect(() => {
    // Debounce search
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    const timer = setTimeout(() => {
      loadTransactions();
    }, 500);
    setSearchDebounce(timer);
    return () => {
      if (searchDebounce) clearTimeout(searchDebounce);
    };
  }, [search]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const offset = (pagination.page - 1) * pagination.limit;
      const data = await api.getMarketingTransactions({
        search: search || undefined,
        limit: pagination.limit,
        offset,
      });
      setTransactions(data.transactions);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSubtypeLabel = (subtype) => {
    const labels = {
      'deposit': 'Deposit',
      'cold_to_real': 'Cold to Real',
      'card_to_card': 'Card to Card',
      'real_to_cold': 'Real to Cold',
    };
    return labels[subtype] || subtype;
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 text-surface-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-primary-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-primary-600" />
    );
  };

  return (
    <div className="max-w-full mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Marketing Dashboard</h1>
        <p className="text-surface-500">
          View all cold balance and deposit transactions
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions by description, card name, or identifier..."
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-surface-500">No transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50">
                    <th
                      className="text-left py-3 px-4 font-medium text-surface-700 cursor-pointer hover:bg-surface-100 transition-colors"
                      onClick={() => handleSort('transaction_date')}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        <SortIcon field="transaction_date" />
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-surface-700 cursor-pointer hover:bg-surface-100 transition-colors"
                      onClick={() => handleSort('card_name')}
                    >
                      <div className="flex items-center gap-2">
                        Card
                        <SortIcon field="card_name" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-700">Identifier</th>
                    <th
                      className="text-left py-3 px-4 font-medium text-surface-700 cursor-pointer hover:bg-surface-100 transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        Type
                        <SortIcon field="type" />
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-surface-700 cursor-pointer hover:bg-surface-100 transition-colors"
                      onClick={() => handleSort('subtype')}
                    >
                      <div className="flex items-center gap-2">
                        Subtype
                        <SortIcon field="subtype" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 font-medium text-surface-700 cursor-pointer hover:bg-surface-100 transition-colors"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Amount
                        <SortIcon field="amount" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-700">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-700">Ad Account</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-surface-100 hover:bg-surface-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-surface-700">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-surface-900">{transaction.card_name || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-surface-600">
                        {transaction.card_identifier || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge capitalize ${
                          transaction.type === 'revenue' ? 'badge-success' : 'badge-danger'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-surface-700">
                        {getSubtypeLabel(transaction.subtype)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'revenue' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 px-4 text-surface-600 max-w-xs truncate" title={transaction.description}>
                        {transaction.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-surface-600">
                        {transaction.ad_account_name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200 bg-surface-50">
                <div className="text-sm text-surface-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} transactions
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-surface-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MarketingDashboard;

