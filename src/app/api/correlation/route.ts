import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, llm, gold_core_atoms');
      
    if (samplesError) throw samplesError;

    const { data: labels, error: labelsError } = await supabase
      .from('labels')
      .select('sample_id, selected_atom_id');

    if (labelsError) throw labelsError;

    const labelsMap = new Map(labels.map(l => [l.sample_id, l.selected_atom_id]));

    // Calculate correlation
    let totalLabeled = 0;
    let totalMatched = 0;

    const modelStats: Record<string, { labeled: number, matched: number }> = {
      chatgpt: { labeled: 0, matched: 0 },
      instructgpt: { labeled: 0, matched: 0 },
      perplexity: { labeled: 0, matched: 0 },
    };

    samples.forEach(s => {
      const selectedId = labelsMap.get(s.id);
      if (selectedId) {
        totalLabeled++;
        const goldCores: string[] = s.gold_core_atoms || [];
        const isMatch = goldCores.includes(selectedId);
        
        if (isMatch) totalMatched++;

        const model = s.llm.toLowerCase();
        if (modelStats[model]) {
          modelStats[model].labeled++;
          if (isMatch) modelStats[model].matched++;
        }
      }
    });

    const result = {
      totalLabeled,
      totalMatched,
      overallCorrelation: totalLabeled > 0 ? (totalMatched / totalLabeled) : 0,
      models: Object.keys(modelStats).map(key => ({
        llm: key,
        labeled: modelStats[key].labeled,
        matched: modelStats[key].matched,
        correlation: modelStats[key].labeled > 0 ? (modelStats[key].matched / modelStats[key].labeled) : 0
      }))
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
