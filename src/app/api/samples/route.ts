import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, llm, query, atoms');
      
    if (samplesError) throw samplesError;

    const { data: labels, error: labelsError } = await supabase
      .from('labels')
      .select('sample_id, selected_atom_id');

    if (labelsError) throw labelsError;

    // Combine them
    const labelsMap = new Map(labels.map(l => [l.sample_id, l.selected_atom_id]));

    const result = samples.map(s => ({
      ...s,
      selected_atom_id: labelsMap.get(s.id) || null
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
