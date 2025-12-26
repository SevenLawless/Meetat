import React from 'react';
import { Edit2, Trash2, Link2, Unlink } from 'lucide-react';

const AdAccountList = ({ adAccounts, cards, onEdit, onDelete, onLinkCard, onUnlinkCard, loading }) => {
  if (loading) {
    return (
      <div className="card p-6 text-center">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (adAccounts.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-surface-500">No ad accounts yet. Create your first ad account to get started.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-surface-900 mb-4">Ad Accounts</h2>
      
      <div className="space-y-4">
        {adAccounts.map((account) => {
          const linkedCardIds = (account.linked_cards || []).map(c => c.id);
          const availableCards = cards.filter(c => !linkedCardIds.includes(c.id));

          return (
            <div key={account.id} className="border border-surface-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-surface-900">{account.name}</h3>
                  <p className="text-sm text-surface-500">
                    {account.linked_cards?.length || 0} linked card(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(account)}
                    className="icon-btn"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this ad account?')) {
                        onDelete(account.id);
                      }
                    }}
                    className="icon-btn text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {account.linked_cards && account.linked_cards.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-surface-700 mb-2">Linked Cards:</p>
                  <div className="flex flex-wrap gap-2">
                    {account.linked_cards.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 rounded-lg text-sm"
                      >
                        <span className="text-surface-900">
                          {card.name} (****{card.last_four_digits})
                        </span>
                        <button
                          onClick={() => {
                            if (confirm(`Unlink ${card.name} from ${account.name}?`)) {
                              onUnlinkCard(account.id, card.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                          title="Unlink"
                        >
                          <Unlink className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableCards.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-surface-700 mb-2">Link Card:</p>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        onLinkCard(account.id, parseInt(e.target.value));
                        e.target.value = '';
                      }
                    }}
                    className="input text-sm"
                  >
                    <option value="">Select a card to link...</option>
                    {availableCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} (****{card.last_four_digits})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdAccountList;

