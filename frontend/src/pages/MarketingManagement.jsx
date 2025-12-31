import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';
import CardModal from '../components/marketing/CardModal';
import TransactionModal from '../components/marketing/TransactionModal';
import CardSummary from '../components/marketing/CardSummary';

const MarketingManagement = () => {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardDetails, setCardDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      loadCardDetails(selectedCard.id);
    }
  }, [selectedCard]);

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await api.getCards();
      setCards(data.cards || []);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCardDetails = async (cardId) => {
    try {
      const data = await api.getCard(cardId);
      setCardDetails(data.card);
    } catch (error) {
      console.error('Failed to load card details:', error);
    }
  };

  const filteredCards = cards.filter(card => {
    const query = searchQuery.toLowerCase();
    return (
      card.name.toLowerCase().includes(query) ||
      (card.identifier && card.identifier.toLowerCase().includes(query))
    );
  });

  const handleCreateCard = () => {
    setEditingCard(null);
    setShowCardModal(true);
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setShowCardModal(true);
  };

  const handleSaveCard = async (cardData) => {
    if (editingCard) {
      await api.updateCard(editingCard.id, cardData);
    } else {
      await api.createCard(cardData);
    }
    await loadCards();
    if (selectedCard && selectedCard.id === editingCard?.id) {
      await loadCardDetails(selectedCard.id);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card? All transactions will be deleted.')) {
      return;
    }
    try {
      await api.deleteCard(cardId);
      if (selectedCard?.id === cardId) {
        setSelectedCard(null);
        setCardDetails(null);
      }
      await loadCards();
    } catch (error) {
      console.error('Failed to delete card:', error);
      alert(error.message || 'Failed to delete card');
    }
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = async () => {
    if (selectedCard) {
      await loadCardDetails(selectedCard.id);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!confirm('Are you sure you want to delete this transaction? This will revert the balance changes.')) {
      return;
    }
    try {
      await api.deleteTransaction(transactionId);
      if (selectedCard) {
        await loadCardDetails(selectedCard.id);
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert(error.message || 'Failed to delete transaction');
    }
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

  return (
    <div className="max-w-full mx-auto animate-fade-in h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Marketing Management</h1>
          <p className="text-surface-500 mt-1">
            Manage credit cards and transactions
          </p>
        </div>
        <button
          onClick={handleCreateCard}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Card
        </button>
      </div>

      {/* Two Panel Layout */}
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Left Panel - Card List (30%) */}
        <div className="w-[30%] flex flex-col">
          <div className="card flex-shrink-0">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards..."
                className="input pl-10 w-full"
              />
            </div>

            {/* Card List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-12 text-surface-500">
                {searchQuery ? 'No cards found' : 'No cards yet. Create your first card.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCard?.id === card.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-surface-200 hover:border-primary-300 hover:bg-surface-50'
                    }`}
                  >
                    <div className="font-semibold text-surface-900 mb-1">{card.name}</div>
                    <div className="text-sm text-surface-600">
                      {card.identifier || 'No identifier'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Card Details (70%) */}
        <div className="flex-1 flex flex-col">
          {selectedCard && cardDetails ? (
            <div className="card flex-1 flex flex-col overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-200">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">{cardDetails.name}</h2>
                  {cardDetails.identifier && (
                    <p className="text-sm text-surface-500 mt-1">Identifier: {cardDetails.identifier}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditCard(cardDetails)}
                    className="btn-secondary btn-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCard(cardDetails.id)}
                    className="btn-secondary btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Card Summary */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Summary</h3>
                <CardSummary card={cardDetails} />
              </div>

              {/* Cold Balance Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Cold Balance</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(cardDetails.cold_balance || 0)}
                  </div>
                </div>
              </div>

              {/* Real Balance Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Real Balance</h3>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(cardDetails.real_balance || 0)}
                  </div>
                </div>
              </div>

              {/* Transactions Section */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-surface-700">Transactions</h3>
                  <button
                    onClick={handleAddTransaction}
                    className="btn-primary btn-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Transaction
                  </button>
                </div>

                <div className="flex-1 overflow-auto">
                  {cardDetails.transactions && cardDetails.transactions.length > 0 ? (
                    <div className="space-y-2">
                      {cardDetails.transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className={`p-4 rounded-lg border-2 ${
                            transaction.type === 'revenue'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`badge ${
                                  transaction.type === 'revenue' ? 'badge-success' : 'badge-danger'
                                }`}>
                                  {transaction.type === 'revenue' ? 'Revenue' : 'Expense'}
                                </span>
                                <span className="text-xs text-surface-500">
                                  {transaction.subtype}
                                </span>
                              </div>
                              <div className={`text-lg font-bold ${
                                transaction.type === 'revenue' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {transaction.type === 'revenue' ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </div>
                              {transaction.description && (
                                <p className="text-sm text-surface-600 mt-1">{transaction.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                                <span>{formatDate(transaction.transaction_date)}</span>
                                {transaction.ad_account_name && (
                                  <span>Ad Account: {transaction.ad_account_name}</span>
                                )}
                                {transaction.source_card_name && (
                                  <span>From: {transaction.source_card_name}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditTransaction(transaction)}
                                className="icon-btn"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="icon-btn text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-surface-500">
                      No transactions yet. Add your first transaction.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-surface-500 text-lg">Select a card to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCardModal && (
        <CardModal
          card={editingCard}
          onClose={() => {
            setShowCardModal(false);
            setEditingCard(null);
          }}
          onSave={handleSaveCard}
        />
      )}

      {showTransactionModal && selectedCard && (
        <TransactionModal
          transaction={editingTransaction}
          card={selectedCard}
          cards={cards}
          adAccounts={[]}
          onClose={() => {
            setShowTransactionModal(false);
            setEditingTransaction(null);
          }}
          onSave={handleSaveTransaction}
        />
      )}
    </div>
  );
};

export default MarketingManagement;
