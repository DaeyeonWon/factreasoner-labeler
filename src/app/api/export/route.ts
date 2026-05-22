import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, llm, query, atoms, gold_core_atoms');
      
    if (samplesError) throw samplesError;

    const { data: labels, error: labelsError } = await supabase
      .from('labels')
      .select('sample_id, selected_atom_id');

    if (labelsError) throw labelsError;

    const labelsMap = new Map(labels.map(l => [l.sample_id, l.selected_atom_id]));

    // CSV Header
    let csv = `Sample ID,LLM,Query,Selected Atom ID,Selected Atom Text,Is Gold Core Match\n`;

    samples.forEach(s => {
      const selectedId = labelsMap.get(s.id);
      if (selectedId) {
        const goldCores: string[] = s.gold_core_atoms || [];
        const isMatch = goldCores.includes(selectedId);
        
        let selectedText = '';
        const atomsList = typeof s.atoms === 'string' ? JSON.parse(s.atoms) : s.atoms;
        if (Array.isArray(atomsList)) {
          const atom = atomsList.find((a: any) => a.id === selectedId);
          if (atom) {
            // Escape quotes for CSV
            selectedText = atom.text.replace(/"/g, '""');
          }
        }

        // Clean query
        const safeQuery = (s.query || '').replace(/"/g, '""');
        
        csv += `"${s.id}","${s.llm}","${safeQuery}","${selectedId}","${selectedText}","${isMatch}"\n`;
      }
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="factreasoner_labels.csv"'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
