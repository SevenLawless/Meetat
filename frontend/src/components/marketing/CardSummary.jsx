import React from 'react';
import { Wallet, TrendingUp } from 'lucide-react';

const CardSummary = ({ card }) => {
  if (!card) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const totalBalance = card.total_balance || (parseFloat(card.cold_balance || 0) + parseFloat(card.real_balance || 0));
  const availableDotation = card.available_dotation !== undefined 
    ? card.available_dotation 
    : (parseFloat(card.dotation || 0) - parseFloat(card.real_balance || 0));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Wallet className="w-4 h-4 text-surface-400" />
        <div>
          <p className="text-xs text-surface-500">Total Balance</p>
          <p className="font-semibold text-surface-900">{formatCurrency(totalBalance)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 text-surface-400 text-xs">C</div>
        <div>
          <p className="text-xs text-surface-500">Cold Balance</p>
          <p className="font-semibold text-surface-900">{formatCurrency(card.cold_balance || 0)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 text-surface-400 text-xs">R</div>
        <div>
          <p className="text-xs text-surface-500">Real Balance</p>
          <p className="font-semibold text-surface-900">{formatCurrency(card.real_balance || 0)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-surface-400" />
        <div>
          <p className="text-xs text-surface-500">Dotation Left</p>
          <p className={`font-semibold ${availableDotation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(availableDotation)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardSummary;

