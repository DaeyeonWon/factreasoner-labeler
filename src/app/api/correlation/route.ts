import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { pearson, spearman, kendall } from '@/lib/stats';

export async function GET() {
  try {
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, llm, atoms, gold_core_atoms');
      
    if (samplesError) throw samplesError;

    const { data: labels, error: labelsError } = await supabase
      .from('labels')
      .select('sample_id, selected_atom_id');

    if (labelsError) throw labelsError;

    const labelsMap = new Map(labels.map(l => [l.sample_id, l.selected_atom_id]));

    let totalLabeled = 0;
    let totalMatched = 0;

    const modelStats: Record<string, any> = {
      chatgpt: { labeled: 0, matched: 0, x: [] as number[], y: [] as number[] },
      instructgpt: { labeled: 0, matched: 0, x: [] as number[], y: [] as number[] },
      perplexity: { labeled: 0, matched: 0, x: [] as number[], y: [] as number[] },
    };

    const overallX: number[] = [];
    const overallY: number[] = [];

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

        // Build binary arrays for atoms
        const atomsList = typeof s.atoms === 'string' ? JSON.parse(s.atoms) : s.atoms;
        if (Array.isArray(atomsList)) {
          atomsList.forEach((atom: any) => {
            const xVal = atom.id === selectedId ? 1 : 0;
            const yVal = goldCores.includes(atom.id) ? 1 : 0;
            overallX.push(xVal);
            overallY.push(yVal);
            if (modelStats[model]) {
              modelStats[model].x.push(xVal);
              modelStats[model].y.push(yVal);
            }
          });
        }
      }
    });

    const result = {
      totalLabeled,
      totalMatched,
      overallCorrelation: totalLabeled > 0 ? (totalMatched / totalLabeled) : 0,
      pearson: pearson(overallX, overallY),
      spearman: spearman(overallX, overallY),
      kendall: kendall(overallX, overallY),
      models: Object.keys(modelStats).map(key => ({
        llm: key,
        labeled: modelStats[key].labeled,
        matched: modelStats[key].matched,
        correlation: modelStats[key].labeled > 0 ? (modelStats[key].matched / modelStats[key].labeled) : 0,
        pearson: pearson(modelStats[key].x, modelStats[key].y),
        spearman: spearman(modelStats[key].x, modelStats[key].y),
        kendall: kendall(modelStats[key].x, modelStats[key].y)
      }))
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
