'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, BarChart } from 'lucide-react';

type ModelStat = {
  llm: string;
  labeled: number;
  matched: number;
  correlation: number;
};

type CorrelationData = {
  totalLabeled: number;
  totalMatched: number;
  overallCorrelation: number;
  models: ModelStat[];
};

export default function CorrelationPage() {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const formatPercent = (val: number) => (val * 100).toFixed(1) + '%';

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Labeling</span>
          </Link>
          <button 
            onClick={fetchData} 
            className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm rounded-md text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <BarChart size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Human vs LLM Correlation</h1>
              <p className="text-slate-500 text-sm">Agreement rate between human selected core atoms and original gold labels</p>
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
              <div className="text-sm font-medium text-blue-600 mb-1">Overall Correlation</div>
              <div className="text-4xl font-black text-blue-700">{formatPercent(data.overallCorrelation)}</div>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Breakdown by LLM Model</h2>
          <div className="space-y-4">
            {data.models.map(m => (
              <div key={m.llm} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-slate-700 capitalize">{m.llm}</span>
                  <span className="text-sm text-slate-500">{m.matched} matches out of {m.labeled} labeled</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">
                  {formatPercent(m.correlation)}
                </div>
              </div>
            ))}
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
