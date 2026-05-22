'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, BarChart, Download } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type ModelStat = {
  llm: string;
  labeled: number;
  matched: number;
  correlation: number;
  pearson: number;
  spearman: number;
  kendall: number;
};

type CorrelationData = {
  totalLabeled: number;
  totalMatched: number;
  overallCorrelation: number;
  pearson: number;
  spearman: number;
  kendall: number;
  models: ModelStat[];
};

type MetricType = 'correlation' | 'pearson' | 'spearman' | 'kendall';

export default function CorrelationPage() {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>('correlation');

  const fetchData = () => {
    setLoading(true);
    fetch('/api/correlation')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">Calculating Correlation...</div>;
  }

  const formatPercent = (val: number) => {
    if (isNaN(val) || val === null) return '0.0%';
    return (val * 100).toFixed(1) + '%';
  };
  
  const formatRaw = (val: number) => {
    if (isNaN(val) || val === null) return '0.000';
    return val.toFixed(3);
  };

  const metricLabels: Record<MetricType, string> = {
    correlation: 'Agreement Rate',
    pearson: 'Pearson Correlation',
    spearman: 'Spearman Rank',
    kendall: 'Kendall Tau'
  };

  const getMetricValue = (source: any) => {
    return source[metric] || 0;
  };

  // Recharts Data preparation
  const chartData = data.models.map(m => ({
    name: m.llm.toUpperCase(),
    value: getMetricValue(m),
    displayValue: metric === 'correlation' ? formatPercent(getMetricValue(m)) : formatRaw(getMetricValue(m))
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'];

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Labeling</span>
          </Link>
          <div className="flex items-center gap-3">
            <a 
              href="/api/export" 
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white shadow-sm rounded-md hover:bg-indigo-700 transition"
            >
              <Download size={16} /> Download CSV
            </a>
            <button 
              onClick={fetchData} 
              className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm rounded-md text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw size={16} /> Refresh Data
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <BarChart size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Human vs LLM Correlation</h1>
                <p className="text-slate-500 text-sm">Measure how human labels align with original Gold Core assignments</p>
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Correlation Metric</label>
              <select 
                value={metric} 
                onChange={(e) => setMetric(e.target.value as MetricType)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium"
              >
                <option value="correlation">Agreement Rate (Accuracy)</option>
                <option value="pearson">Pearson Correlation (MCC)</option>
                <option value="spearman">Spearman Rank Correlation</option>
                <option value="kendall">Kendall Tau-b Correlation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-slate-50 rounded-xl border">
              <div className="text-sm font-medium text-slate-500 mb-1">Total Labeled</div>
              <div className="text-3xl font-bold text-slate-800">{data.totalLabeled} <span className="text-sm font-normal text-slate-400">/ 469</span></div>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border">
              <div className="text-sm font-medium text-slate-500 mb-1">Total Matched</div>
              <div className="text-3xl font-bold text-indigo-600">{data.totalMatched}</div>
            </div>
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-sm font-medium text-blue-600 mb-1">Overall {metricLabels[metric]}</div>
              <div className="text-4xl font-black text-blue-700">
                {metric === 'correlation' ? formatPercent(getMetricValue(data)) : formatRaw(getMetricValue(data))}
              </div>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-800 mb-6 border-b pb-2">Breakdown by LLM Model</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Chart Area */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>

            {/* List Area */}
            <div className="flex flex-col justify-center space-y-4">
              {data.models.map((m, i) => (
                <div key={m.llm} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-slate-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-slate-700 capitalize">{m.llm}</span>
                      <span className="text-sm text-slate-500">{m.matched} matches / {m.labeled} labeled</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {metric === 'correlation' ? formatPercent(getMetricValue(m)) : formatRaw(getMetricValue(m))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {data.totalLabeled === 0 && (
            <div className="mt-8 p-4 bg-amber-50 text-amber-700 rounded-lg text-center font-medium">
              No samples have been labeled yet. Go back and label some samples to see correlation data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
