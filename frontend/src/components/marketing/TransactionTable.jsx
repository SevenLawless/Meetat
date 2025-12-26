import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import api from '../../services/api';
import { Edit2, Trash2 } from 'lucide-react';

// Actions cell renderer component
const ActionsCellRenderer = ({ data, onEdit, onDelete }) => {
  return (
    <div className="flex items-center gap-2 h-full">
      <button
        onClick={() => onEdit(data.id)}
        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
        title="Edit"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => onDelete(data.id)}
        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

const TransactionTable = ({ cardId, onDelete, onEdit, refreshTrigger }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCardTransactions(cardId);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, refreshTrigger]);

  const formatCurrency = (params) => {
    if (params.value == null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(params.value);
  };

  const formatDate = (params) => {
    if (!params.value) return '';
    return new Date(params.value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columnDefs = useMemo(() => {
    const TypeBadgeRenderer = ({ data }) => {
      const type = data?.type;
      const subtype = data?.subtype;
      const className = type === 'revenue' 
        ? 'bg-green-100 text-green-700' 
        : 'bg-red-100 text-red-700';
      
      let label = type === 'revenue' ? 'Revenue' : 'Expense';
      if (subtype) {
        const subtypeLabels = {
          'cold_to_real': 'Cold → Real',
          'card_to_card': 'Card Transfer',
          'ad_account_spend': 'Ad Spend',
          'real_to_cold': 'Real → Cold',
        };
        label += ` (${subtypeLabels[subtype] || subtype})`;
      }
      
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
          {label}
        </span>
      );
    };
    const actionsParams = {
      onEdit: async (id) => {
        const transaction = transactions.find(t => t.id === id);
        if (transaction && onEdit) {
          onEdit(transaction);
        }
      },
      onDelete: async (id) => {
        const transaction = transactions.find(t => t.id === id);
        if (transaction && onDelete) {
          if (confirm('Are you sure you want to delete this transaction? This will revert the balance changes.')) {
            await onDelete(id);
            // Reload transactions after delete
            await loadTransactions();
          }
        }
      },
    };

    return [
    {
      field: 'transaction_date',
      headerName: 'Date',
      width: 120,
      valueFormatter: formatDate,
      sortable: true,
      filter: true,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 180,
      cellRenderer: TypeBadgeRenderer,
      sortable: true,
      filter: true,
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 130,
      valueFormatter: formatCurrency,
      sortable: true,
      filter: true,
      cellStyle: { fontWeight: '600' },
    },
    {
      field: 'ad_account_name',
      headerName: 'Ad Account',
      width: 150,
      sortable: true,
      filter: true,
    },
    {
      field: 'source_card_name',
      headerName: 'Source Card',
      width: 150,
      sortable: true,
      filter: true,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      sortable: true,
      filter: true,
      cellRenderer: (params) => {
        return params.value || '-';
      },
    },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: ActionsCellRenderer,
      cellRendererParams: actionsParams,
    },
  ];
  }, [transactions, onEdit, onDelete, loadTransactions]);


  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-surface-500">
        No transactions yet. Add your first transaction to get started.
      </div>
    );
  }

  return (
    <div className="ag-theme-alpine" style={{ height: '400px', width: '100%' }}>
      <AgGridReact
        rowData={transactions}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={10}
        domLayout="normal"
        suppressCellFocus={true}
      />
    </div>
  );
};

export default TransactionTable;

