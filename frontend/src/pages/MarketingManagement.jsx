import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';
import GlobalSummary from '../components/marketing/GlobalSummary';
import CardList from '../components/marketing/CardList';
import CardModal from '../components/marketing/CardModal';
import TransactionModal from '../components/marketing/TransactionModal';
import AdAccountList from '../components/marketing/AdAccountList';
import AdAccountModal from '../components/marketing/AdAccountModal';

const MarketingManagement = () => {
  const [cards, setCards] = useState([]);
  const [adAccounts, setAdAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionCard, setTransactionCard] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAdAccountModal, setShowAdAccountModal] = useState(false);
  const [editingAdAccount, setEditingAdAccount] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardsData, adAccountsData, summaryData] = await Promise.all([
        api.getCards(),
        api.getAdAccounts(),
        api.getMarketingSummary(),
      ]);
      
      setCards(cardsData.cards || []);
      setAdAccounts(adAccountsData.ad_accounts || []);
      setSummary(summaryData.summary || null);
    } catch (error) {
      console.error('Failed to load marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    await loadData();
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await api.deleteCard(cardId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete card:', error);
      alert(error.message || 'Failed to delete card');
    }
  };

  const handleAddTransaction = (card) => {
    setTransactionCard(card);
    setEditingTransaction(null);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = async (transaction) => {
    setEditingTransaction(transaction);
    // Load the card details for this transaction
    try {
      const cardData = await api.getCard(transaction.card_id);
      setTransactionCard(cardData.card || null);
    } catch (error) {
      console.error('Failed to load card:', error);
      // Try to find from existing cards
      const card = cards.find(c => c.id === transaction.card_id);
      setTransactionCard(card || null);
    }
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = async () => {
    await loadData();
  };

  const handleDeleteTransaction = async (transactionId) => {
    try {
      await api.deleteTransaction(transactionId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert(error.message || 'Failed to delete transaction');
    }
  };

  const handleCreateAdAccount = () => {
    setEditingAdAccount(null);
    setShowAdAccountModal(true);
  };

  const handleEditAdAccount = (adAccount) => {
    setEditingAdAccount(adAccount);
    setShowAdAccountModal(true);
  };

  const handleSaveAdAccount = async (adAccountData) => {
    if (editingAdAccount) {
      await api.updateAdAccount(editingAdAccount.id, adAccountData);
    } else {
      await api.createAdAccount(adAccountData);
    }
    await loadData();
  };

  const handleDeleteAdAccount = async (adAccountId) => {
    try {
      await api.deleteAdAccount(adAccountId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete ad account:', error);
      alert(error.message || 'Failed to delete ad account');
    }
  };

  const handleLinkCard = async (adAccountId, cardId) => {
    try {
      await api.linkCardToAdAccount(adAccountId, cardId);
      await loadData();
    } catch (error) {
      console.error('Failed to link card:', error);
      alert(error.message || 'Failed to link card');
    }
  };

  const handleUnlinkCard = async (adAccountId, cardId) => {
    try {
      await api.unlinkCardFromAdAccount(adAccountId, cardId);
      await loadData();
    } catch (error) {
      console.error('Failed to unlink card:', error);
      alert(error.message || 'Failed to unlink card');
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Marketing Management</h1>
          <p className="text-surface-500 mt-1">
            Manage credit cards, transactions, and ad accounts
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCreateCard}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Card
          </button>
          <button
            onClick={handleCreateAdAccount}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4" />
            New Ad Account
          </button>
        </div>
      </div>

      {/* Global Summary */}
      <GlobalSummary summary={summary} />

      {/* Credit Cards */}
      <div className="mb-8">
        <CardList
          cards={cards}
          onEdit={handleEditCard}
          onDelete={handleDeleteCard}
          onAddTransaction={handleAddTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onEditTransaction={handleEditTransaction}
          loading={loading}
        />
      </div>

      {/* Ad Accounts */}
      <div className="mb-8">
        <AdAccountList
          adAccounts={adAccounts}
          cards={cards}
          onEdit={handleEditAdAccount}
          onDelete={handleDeleteAdAccount}
          onLinkCard={handleLinkCard}
          onUnlinkCard={handleUnlinkCard}
          loading={loading}
        />
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

      {showTransactionModal && (
        <TransactionModal
          transaction={editingTransaction}
          card={transactionCard}
          cards={cards}
          adAccounts={adAccounts}
          onClose={() => {
            setShowTransactionModal(false);
            setTransactionCard(null);
            setEditingTransaction(null);
          }}
          onSave={handleSaveTransaction}
        />
      )}

      {showAdAccountModal && (
        <AdAccountModal
          adAccount={editingAdAccount}
          onClose={() => {
            setShowAdAccountModal(false);
            setEditingAdAccount(null);
          }}
          onSave={handleSaveAdAccount}
        />
      )}
    </div>
  );
};

export default MarketingManagement;

