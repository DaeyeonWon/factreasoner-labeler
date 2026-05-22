'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart2, CheckCircle, Clock, ChevronRight } from 'lucide-react';

type Sample = {
  id: string;
  llm: string;
  selected_atom_id: string | null;
};

const ITEMS_PER_PAGE = 20;

export default function DashboardPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/samples')
      .then(res => res.json())
      .then((data: Sample[]) => {
        data.sort((a, b) => a.llm.localeCompare(b.llm) || a.id.localeCompare(b.id));
        setSamples(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">Loading Dashboard...</div>;

  const totalSamples = samples.length;
  const totalLabeled = samples.filter(s => s.selected_atom_id).length;
  const totalPages = Math.ceil(totalSamples / ITEMS_PER_PAGE);

  const batches = Array.from({ length: totalPages }).map((_, index) => {
    const start = index * ITEMS_PER_PAGE;
    const batchSamples = samples.slice(start, start + ITEMS_PER_PAGE);
    const labeledCount = batchSamples.filter(s => s.selected_atom_id).length;
    return {
      id: index,
      labeledCount,
      totalCount: batchSamples.length,
      isCompleted: labeledCount === batchSamples.length
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Labeling Dashboard</h1>
            <p className="text-slate-500 mt-1">Select a batch below to start labeling core atoms.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Progress</div>
              <div className="text-xl font-bold text-blue-600">{totalLabeled} / {totalSamples}</div>
            </div>
            <Link href="/correlation" className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition font-medium">
              <BarChart2 size={18} />
              <span>View Correlation</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(batch => (
            <Link key={batch.id} href={`/batch/${batch.id}`}>
              <div className={`p-5 rounded-xl border-2 transition-all hover:-translate-y-1 hover:shadow-md ${
                batch.isCompleted 
                  ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300' 
                  : 'bg-white border-slate-200 hover:border-blue-400'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-bold text-slate-800">Batch {batch.id + 1}</h2>
                  {batch.isCompleted ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
                      <CheckCircle size={14} /> Completed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      <Clock size={14} /> In Progress
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium text-slate-500">
                    <span>Progress</span>
                    <span className={batch.isCompleted ? 'text-blue-600' : 'text-slate-700'}>
                      {batch.labeledCount} / {batch.totalCount}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${batch.isCompleted ? 'bg-blue-500' : 'bg-blue-400'}`} 
                      style={{ width: `${(batch.labeledCount / batch.totalCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-slate-500 group-hover:text-blue-600 transition">
                  <span>{batch.isCompleted ? 'Review Batch' : 'Continue Labeling'}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
