import React from 'react';
import { Wallet, CreditCard, TrendingUp, DollarSign } from 'lucide-react';

const GlobalSummary = ({ summary }) => {
  if (!summary) {
    return (
      <div className="card p-6">
        <div className="text-center text-surface-500">Loading summary...</div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const stats = [
    {
      label: 'Total Balance',
      value: formatCurrency(summary.total_balance),
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Cold Balance',
      value: formatCurrency(summary.total_cold_balance),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Real Balance',
      value: formatCurrency(summary.total_real_balance),
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Available Dotation',
      value: formatCurrency(summary.total_available_dotation),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Total Dotation',
      value: formatCurrency(summary.total_dotation),
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      label: 'Total Cards',
      value: summary.total_cards,
      icon: CreditCard,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-lg font-semibold text-surface-900 mb-4">Global Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-lg border border-surface-200 bg-white"
            >
              <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-500 mb-1">{stat.label}</p>
                <p className="text-lg font-semibold text-surface-900 truncate">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GlobalSummary;

