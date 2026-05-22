'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Save, BarChart2 } from 'lucide-react';
import Link from 'next/link';

type Atom = { id: string; text: string };
type Sample = {
  id: string;
  llm: string;
  query: string;
  atoms: Atom[];
  selected_atom_id: string | null;
};

const ITEMS_PER_PAGE = 20;

export default function LabelingPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for selections before saving
  const [selections, setSelections] = useState<Record<string, string>>({});
  
  const [currentPage, setCurrentPage] = useState(0);
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0); // index relative to current page
  
  useEffect(() => {
    fetch('/api/samples')
      .then(res => res.json())
      .then((data: Sample[]) => {
        // Sort by LLM then ID for consistency
        data.sort((a, b) => a.llm.localeCompare(b.llm) || a.id.localeCompare(b.id));
        setSamples(data);
        
        // Initialize local selections with DB data
        const initialSelections: Record<string, string> = {};
        data.forEach(s => {
          if (s.selected_atom_id) {
            initialSelections[s.id] = s.selected_atom_id;
          }
        });
        setSelections(initialSelections);
        setLoading(false);
      });
  }, []);

  const totalPages = Math.ceil(samples.length / ITEMS_PER_PAGE);
  const currentPageSamples = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return samples.slice(start, start + ITEMS_PER_PAGE);
  }, [samples, currentPage]);

  const currentSample = currentPageSamples[currentSampleIndex];

  // Check if all items in current page are labeled
  const isCurrentPageComplete = useMemo(() => {
    return currentPageSamples.every(s => selections[s.id] !== undefined);
  }, [currentPageSamples, selections]);

  const handleSelect = (atomId: string) => {
    if (!currentSample) return;
    
    setSelections(prev => ({
      ...prev,
      [currentSample.id]: atomId
    }));

    // Auto-advance
    if (currentSampleIndex < currentPageSamples.length - 1) {
      setTimeout(() => setCurrentSampleIndex(i => i + 1), 300);
    }
  };

  const handleSave = async () => {
    if (!isCurrentPageComplete) return;
    setSaving(true);
    
    const labelsToSave = currentPageSamples.map(s => ({
      sample_id: s.id,
      selected_atom_id: selections[s.id]
    }));

    await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels: labelsToSave })
    });
    
    setSaving(false);
    alert('Saved successfully!');
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">Loading...</div>;
  if (!samples.length) return <div className="p-8">No samples found.</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800">FactReasoner Labeler</h1>
          <p className="text-sm text-slate-500">Select the Core Atom that best answers the query.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/correlation" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition">
            <BarChart2 size={18} />
            <span>View Correlation</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={!isCurrentPageComplete || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
              isCurrentPageComplete && !saving
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Batch'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-6 flex flex-col items-center">
        {/* Pagination Controls */}
        <div className="w-full max-w-4xl flex justify-between items-center mb-6">
          <button
            onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); setCurrentSampleIndex(0); }}
            disabled={currentPage === 0}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 disabled:opacity-30"
          >
            <ChevronLeft size={20} /> Prev Batch
          </button>
          <span className="font-medium text-slate-600">
            Batch {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => { setCurrentPage(p => Math.min(totalPages - 1, p + 1)); setCurrentSampleIndex(0); }}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 disabled:opacity-30"
          >
            Next Batch <ChevronRight size={20} />
          </button>
        </div>

        {/* Current Sample Card */}
        {currentSample && (
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-start mb-6">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                {currentSample.llm}
              </span>
              <span className="text-sm font-medium text-slate-400">
                Item {currentSampleIndex + 1} of {currentPageSamples.length}
              </span>
            </div>

            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Query</h2>
              <p className="text-xl text-slate-800 leading-relaxed font-medium">
                {currentSample.query}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Response Atoms</h2>
              <div className="space-y-3">
                {currentSample.atoms.map(atom => {
                  const isSelected = selections[currentSample.id] === atom.id;
                  return (
                    <label
                      key={atom.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="pt-1">
                        <input
                          type="radio"
                          name={`atom-${currentSample.id}`}
                          value={atom.id}
                          checked={isSelected}
                          onChange={() => handleSelect(atom.id)}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      <span className={`text-lg leading-relaxed ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                        {atom.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            
            {/* Intra-batch navigation */}
            <div className="flex justify-between items-center mt-10 pt-6 border-t">
               <button
                  onClick={() => setCurrentSampleIndex(i => Math.max(0, i - 1))}
                  disabled={currentSampleIndex === 0}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
               >
                 Previous Item
               </button>
               <button
                  onClick={() => setCurrentSampleIndex(i => Math.min(currentPageSamples.length - 1, i + 1))}
                  disabled={currentSampleIndex === currentPageSamples.length - 1}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
               >
                 Next Item
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Status Bar (Global Progress) */}
      <footer className="bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-10">
        <div className="max-w-7xl mx-auto flex gap-1 flex-wrap justify-center">
          {samples.map((s, globalIndex) => {
            const isCompleted = !!selections[s.id];
            const pageIndex = Math.floor(globalIndex / ITEMS_PER_PAGE);
            const isCurrent = currentPage === pageIndex && currentSampleIndex === (globalIndex % ITEMS_PER_PAGE);
            
            return (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentPage(pageIndex);
                  setCurrentSampleIndex(globalIndex % ITEMS_PER_PAGE);
                }}
                className="group relative"
              >
                <div 
                  className={`w-3 h-8 rounded-sm transition-all duration-200 ${
                    isCurrent 
                      ? 'bg-yellow-400 ring-2 ring-yellow-400 ring-offset-2 scale-110 z-10' 
                      : isCompleted 
                        ? 'bg-blue-500 hover:bg-blue-600' 
                        : 'bg-slate-200 hover:bg-slate-300'
                  }`} 
                />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-20">
                  Item {globalIndex + 1} {isCompleted ? '(Done)' : ''}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-center mt-3 text-sm font-medium text-slate-500">
          Global Progress: {Object.keys(selections).length} / {samples.length} items labeled
        </div>
      </footer>
    </div>
  );
}
