import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2, Plus } from 'lucide-react';
import CardSummary from './CardSummary';
import TransactionTable from './TransactionTable';

const CardList = ({ cards, onEdit, onDelete, onAddTransaction, onDeleteTransaction, onEditTransaction, loading }) => {
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh transactions when a transaction is deleted/edited
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [cards]);

  const toggleCard = (cardId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedCards = [...cards].sort((a, b) => {
    let aVal, bVal;
    
    if (sortBy === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortBy === 'dotation') {
      aVal = parseFloat(a.dotation || 0);
      bVal = parseFloat(b.dotation || 0);
    } else if (sortBy === 'total_balance') {
      aVal = parseFloat(a.total_balance || 0);
      bVal = parseFloat(b.total_balance || 0);
    } else {
      return 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="card p-6 text-center">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-surface-500">No cards yet. Create your first card to get started.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-surface-900">Credit Cards</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-surface-700"></th>
              <th 
                className="text-left py-3 px-4 text-sm font-medium text-surface-700 cursor-pointer hover:bg-surface-50"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon field="name" />
              </th>
              <th 
                className="text-left py-3 px-4 text-sm font-medium text-surface-700 cursor-pointer hover:bg-surface-50"
                onClick={() => handleSort('dotation')}
              >
                Dotation <SortIcon field="dotation" />
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-surface-700">Summary</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-surface-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedCards.map((card) => {
              const isExpanded = expandedCards.has(card.id);
              const formatCurrency = (amount) => {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(amount);
              };

              return (
                <React.Fragment key={card.id}>
                  <tr className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleCard(card.id)}
                        className="icon-btn"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-surface-900">{card.name}</p>
                        <p className="text-xs text-surface-500">**** {card.last_four_digits}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-surface-900">
                        {formatCurrency(card.dotation || 0)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <CardSummary card={card} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(card)}
                          className="icon-btn"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this card? All transactions will be deleted.')) {
                                onDelete(card.id);
                              }
                          }}
                          className="icon-btn text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="py-4 px-4 bg-surface-50">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-medium text-surface-900">Transactions</h3>
                          <button
                            onClick={() => onAddTransaction(card)}
                            className="btn-primary text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add Transaction
                          </button>
                        </div>
                        <TransactionTable
                          cardId={card.id}
                          onDelete={onDeleteTransaction}
                          onEdit={onEditTransaction}
                          refreshTrigger={refreshTrigger}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CardList;

