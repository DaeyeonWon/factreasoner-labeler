'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Save, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';

type Atom = { id: string; text: string };
type Sample = {
  id: string;
  llm: string;
  query: string;
  atoms: Atom[];
  selected_atom_id: string | null;
};

const ITEMS_PER_PAGE = 20;

export default function BatchLabelingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const batchId = parseInt(id, 10);
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for selections
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0); 
  
  useEffect(() => {
    fetch('/api/samples')
      .then(res => res.json())
      .then((data: Sample[]) => {
        data.sort((a, b) => a.llm.localeCompare(b.llm) || a.id.localeCompare(b.id));
        setSamples(data);
        
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

  const batchSamples = useMemo(() => {
    const start = batchId * ITEMS_PER_PAGE;
    return samples.slice(start, start + ITEMS_PER_PAGE);
  }, [samples, batchId]);

  const currentSample = batchSamples[currentSampleIndex];

  // Check if all items in CURRENT BATCH are labeled
  const isBatchComplete = useMemo(() => {
    return batchSamples.length > 0 && batchSamples.every(s => selections[s.id] !== undefined);
  }, [batchSamples, selections]);

  const handleSelect = (atomId: string) => {
    if (!currentSample) return;
    
    setSelections(prev => ({
      ...prev,
      [currentSample.id]: atomId
    }));

    if (currentSampleIndex < batchSamples.length - 1) {
      setTimeout(() => setCurrentSampleIndex(i => i + 1), 300);
    }
  };

  const handleClearBatch = async () => {
    if (!confirm('Are you sure you want to clear all labels for this batch? This will delete the data from the database.')) return;
    setSaving(true);
    
    const sampleIds = batchSamples.map(s => s.id);

    await fetch('/api/labels', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_ids: sampleIds })
    });
    
    setSelections(prev => {
      const next = { ...prev };
      sampleIds.forEach(id => delete next[id]);
      return next;
    });
    
    setSaving(false);
    alert('Batch cleared successfully!');
  };

  const handleSave = async () => {
    if (!isBatchComplete) return;
    setSaving(true);
    
    const labelsToSave = batchSamples.map(s => ({
      sample_id: s.id,
      selected_atom_id: selections[s.id]
    }));

    await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels: labelsToSave })
    });
    
    setSaving(false);
    alert('Batch saved successfully!');
    router.push('/');
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">Loading Batch...</div>;
  if (!batchSamples.length) return <div className="p-8">Batch not found.</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4 shadow-sm z-10">
        <Link href="/" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Batch {batchId + 1}</h1>
          <p className="text-sm text-slate-500">Labeling {batchSamples.length} items</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 flex flex-col items-center pb-24">
        {currentSample && (
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-start mb-6">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                {currentSample.llm}
              </span>
              <span className="text-sm font-medium text-slate-400">
                Item {currentSampleIndex + 1} of {batchSamples.length}
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
            
            <div className="flex justify-between items-center mt-10 pt-6 border-t">
               <button
                  onClick={() => setCurrentSampleIndex(i => Math.max(0, i - 1))}
                  disabled={currentSampleIndex === 0}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1"
               >
                 <ChevronLeft size={16} /> Prev Item
               </button>
               <button
                  onClick={() => setCurrentSampleIndex(i => Math.min(batchSamples.length - 1, i + 1))}
                  disabled={currentSampleIndex === batchSamples.length - 1}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1"
               >
                 Next Item <ChevronRight size={16} />
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Status Bar for Current Batch */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t p-4 shadow-[0_-10px_15px_-3px_rgb(0,0,0,0.05)] z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {batchSamples.map((s, idx) => {
              const isCompleted = !!selections[s.id];
              const isCurrent = currentSampleIndex === idx;
              
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentSampleIndex(idx)}
                  className="group relative"
                >
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      isCurrent 
                        ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-400 ring-offset-2 scale-110 z-10' 
                        : isCompleted 
                          ? 'bg-blue-500 text-white hover:bg-blue-600' 
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`} 
                  >
                    {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearBatch}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              CLEAR
            </button>
            <button
              onClick={handleSave}
              disabled={Object.keys(selections).length === 0 || saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all duration-200 ${
                Object.keys(selections).length > 0 && !saving
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'SAVE PROGRESS'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
