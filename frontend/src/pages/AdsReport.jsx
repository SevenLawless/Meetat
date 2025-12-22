import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  ArrowLeft,
  Plus,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  X,
  Trash2,
  Edit2
} from 'lucide-react';

const COLORS = ['#166534', '#22c55e', '#86efac', '#f59e0b', '#ef4444', '#8b5cf6'];
const CHANNELS = ['facebook', 'google', 'tiktok', 'instagram', 'twitter', 'linkedin', 'youtube', 'other'];

const AdsReport = () => {
  const { projectId } = useParams();
  const [campaigns, setCampaigns] = useState([]);
  const [aggregates, setAggregates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [formData, setFormData] = useState({ name: '', channel: 'facebook', start_date: '', end_date: '' });
  const [metricsData, setMetricsData] = useState([{ date: '', impressions: 0, clicks: 0, spend: 0, conversions: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [campaignsData, aggregatesData] = await Promise.all([
        api.getCampaigns(projectId),
        api.getAggregatedMetrics(projectId, { groupBy: 'day' })
      ]);
      setCampaigns(campaignsData.campaigns);
      setAggregates(aggregatesData);
    } catch (error) {
      console.error('Failed to load ads data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (selectedCampaign) {
        await api.updateCampaign(selectedCampaign.id, formData);
      } else {
        await api.createCampaign({ project_id: parseInt(projectId), ...formData });
      }
      loadData();
      closeCampaignModal();
    } catch (error) {
      console.error('Failed to save campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm('Delete this campaign and all its metrics?')) return;
    try {
      await api.deleteCampaign(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const handleIngestMetrics = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    const validMetrics = metricsData.filter(m => m.date);
    if (validMetrics.length === 0) return;

    setSaving(true);
    try {
      await api.ingestMetrics(selectedCampaign.id, validMetrics);
      loadData();
      closeMetricsModal();
    } catch (error) {
      console.error('Failed to ingest metrics:', error);
    } finally {
      setSaving(false);
    }
  };

  const openEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      channel: campaign.channel,
      start_date: campaign.start_date?.split('T')[0] || '',
      end_date: campaign.end_date?.split('T')[0] || ''
    });
    setShowCampaignModal(true);
  };

  const openMetricsModal = (campaign) => {
    setSelectedCampaign(campaign);
    setMetricsData([{ date: '', impressions: 0, clicks: 0, spend: 0, conversions: 0 }]);
    setShowMetricsModal(true);
  };

  const closeCampaignModal = () => {
    setShowCampaignModal(false);
    setSelectedCampaign(null);
    setFormData({ name: '', channel: 'facebook', start_date: '', end_date: '' });
  };

  const closeMetricsModal = () => {
    setShowMetricsModal(false);
    setSelectedCampaign(null);
    setMetricsData([{ date: '', impressions: 0, clicks: 0, spend: 0, conversions: 0 }]);
  };

  const addMetricRow = () => {
    setMetricsData([...metricsData, { date: '', impressions: 0, clicks: 0, spend: 0, conversions: 0 }]);
  };

  const updateMetricRow = (index, field, value) => {
    const newData = [...metricsData];
    newData[index][field] = field === 'date' ? value : parseFloat(value) || 0;
    setMetricsData(newData);
  };

  const removeMetricRow = (index) => {
    if (metricsData.length > 1) setMetricsData(metricsData.filter((_, i) => i !== index));
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to={`/project/${projectId}`} className="icon-btn">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-surface-900">Ads Report</h1>
            <p className="text-surface-500 text-sm">Track your advertising performance</p>
          </div>
        </div>
        <button onClick={() => setShowCampaignModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* KPI Cards */}
      {aggregates?.totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Eye, label: 'Impressions', value: formatNumber(aggregates.totals.total_impressions), color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: MousePointer, label: 'Clicks', value: formatNumber(aggregates.totals.total_clicks), sub: `CTR: ${aggregates.totals.overall_ctr || 0}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: DollarSign, label: 'Spend', value: formatCurrency(aggregates.totals.total_spend), sub: `CPC: ${formatCurrency(aggregates.totals.overall_cpc)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Target, label: 'Conversions', value: formatNumber(aggregates.totals.total_conversions), sub: `CPA: ${formatCurrency(aggregates.totals.overall_cpa)}`, color: 'text-amber-600', bg: 'bg-amber-50' }
          ].map((kpi, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <span className="text-surface-500 text-sm">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-surface-900">{kpi.value}</p>
              {kpi.sub && <p className="text-sm text-surface-500 mt-1">{kpi.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {aggregates?.daily && aggregates.daily.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={aggregates.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="period" stroke="#737373" fontSize={12} />
                <YAxis stroke="#737373" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="impressions" stroke="#166534" strokeWidth={2} name="Impressions" />
                <Line type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={2} name="Clicks" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 mb-4">Spend & Conversions</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={aggregates.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="period" stroke="#737373" fontSize={12} />
                <YAxis stroke="#737373" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="spend" fill="#166534" name="Spend ($)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="conversions" fill="#22c55e" name="Conversions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {aggregates?.by_channel?.length > 0 && (
            <div className="card p-6 lg:col-span-2">
              <h3 className="font-semibold text-surface-900 mb-4">Performance by Channel</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={aggregates.by_channel} dataKey="spend" nameKey="channel" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {aggregates.by_channel.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {aggregates.by_channel.map((channel, index) => (
                    <div key={channel.channel} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-surface-700 capitalize text-sm">{channel.channel}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-surface-900 font-medium text-sm">{formatCurrency(channel.spend)}</p>
                        <p className="text-xs text-surface-500">{formatNumber(channel.conversions)} conv.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campaigns Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Campaigns</h3>
        </div>
        
        {campaigns.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-surface-500 mb-4">No campaigns yet</p>
            <button onClick={() => setShowCampaignModal(true)} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="text-left py-3 px-6 text-sm font-medium text-surface-600">Name</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-surface-600">Channel</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-surface-600">Impressions</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-surface-600">Clicks</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-surface-600">Spend</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-surface-600">Conv.</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-surface-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="py-3 px-6 text-surface-900 text-sm">{campaign.name}</td>
                    <td className="py-3 px-6"><span className="badge badge-primary capitalize text-xs">{campaign.channel}</span></td>
                    <td className="py-3 px-6 text-right text-surface-600 text-sm">{formatNumber(campaign.total_impressions)}</td>
                    <td className="py-3 px-6 text-right text-surface-600 text-sm">{formatNumber(campaign.total_clicks)}</td>
                    <td className="py-3 px-6 text-right text-surface-600 text-sm">{formatCurrency(campaign.total_spend)}</td>
                    <td className="py-3 px-6 text-right text-surface-600 text-sm">{formatNumber(campaign.total_conversions)}</td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openMetricsModal(campaign)} className="text-xs text-primary-700 hover:text-primary-800 font-medium px-2 py-1">Add Metrics</button>
                        <button onClick={() => openEditCampaign(campaign)} className="icon-btn p-1"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCampaign(campaign.id)} className="icon-btn p-1 text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-lg font-semibold text-surface-900">{selectedCampaign ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={closeCampaignModal} className="icon-btn"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="label">Campaign Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="Summer Sale Campaign" required />
              </div>
              <div>
                <label className="label">Channel</label>
                <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} className="input">
                  {CHANNELS.map((channel) => (<option key={channel} value={channel}>{channel.charAt(0).toUpperCase() + channel.slice(1)}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Start Date</label><input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="input" /></div>
                <div><label className="label">End Date</label><input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="input" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeCampaignModal} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving...' : selectedCampaign ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metrics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="card w-full max-w-3xl my-8 animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">Add Metrics</h2>
                <p className="text-sm text-surface-500">{selectedCampaign?.name}</p>
              </div>
              <button onClick={closeMetricsModal} className="icon-btn"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleIngestMetrics} className="p-6">
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200">
                      <th className="text-left py-2 px-2 font-medium text-surface-600">Date</th>
                      <th className="text-left py-2 px-2 font-medium text-surface-600">Impressions</th>
                      <th className="text-left py-2 px-2 font-medium text-surface-600">Clicks</th>
                      <th className="text-left py-2 px-2 font-medium text-surface-600">Spend ($)</th>
                      <th className="text-left py-2 px-2 font-medium text-surface-600">Conversions</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricsData.map((row, index) => (
                      <tr key={index}>
                        <td className="py-2 px-2"><input type="date" value={row.date} onChange={(e) => updateMetricRow(index, 'date', e.target.value)} className="input py-1.5 text-sm" required /></td>
                        <td className="py-2 px-2"><input type="number" value={row.impressions} onChange={(e) => updateMetricRow(index, 'impressions', e.target.value)} className="input py-1.5 text-sm" min="0" /></td>
                        <td className="py-2 px-2"><input type="number" value={row.clicks} onChange={(e) => updateMetricRow(index, 'clicks', e.target.value)} className="input py-1.5 text-sm" min="0" /></td>
                        <td className="py-2 px-2"><input type="number" value={row.spend} onChange={(e) => updateMetricRow(index, 'spend', e.target.value)} className="input py-1.5 text-sm" min="0" step="0.01" /></td>
                        <td className="py-2 px-2"><input type="number" value={row.conversions} onChange={(e) => updateMetricRow(index, 'conversions', e.target.value)} className="input py-1.5 text-sm" min="0" /></td>
                        <td className="py-2 px-2">{metricsData.length > 1 && <button type="button" onClick={() => removeMetricRow(index)} className="icon-btn p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addMetricRow} className="text-sm text-primary-700 hover:text-primary-800 font-medium flex items-center gap-1 mb-4"><Plus className="w-4 h-4" />Add Row</button>
              <div className="flex gap-3">
                <button type="button" onClick={closeMetricsModal} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving...' : 'Save Metrics'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsReport;
