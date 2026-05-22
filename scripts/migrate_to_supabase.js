const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DB_URL = "postgres://postgres.svkcjjwcckhprchdptmu:pTx8dHxu4jBgJMDu@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";
const BASE_DIR = "/Users/daniel.won/Workspace/FactReasoner/data/benchmarks/phase1";
const models = ["chatgpt", "instructgpt", "perplexity"];

async function main() {
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to Supabase Postgres...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS samples (
          id VARCHAR PRIMARY KEY,
          llm VARCHAR NOT NULL,
          query TEXT NOT NULL,
          atoms JSONB NOT NULL,
          gold_core_atoms JSONB NOT NULL
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labels (
          sample_id VARCHAR PRIMARY KEY REFERENCES samples(id),
          selected_atom_id VARCHAR NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Tables verified/created.");

    const augmentedRaw = fs.readFileSync(path.join(BASE_DIR, "bio_augmented_query.json"), 'utf8');
    const augmented = JSON.parse(augmentedRaw);

    const goldCoreMap = {};
    for (const sample of augmented) {
      goldCoreMap[sample.id] = sample.atoms.filter(a => a.type === 'core').map(a => a.id);
    }

    let totalUpserted = 0;

    for (const m of models) {
      const dataRaw = fs.readFileSync(path.join(BASE_DIR, `${m}_bio_augmented_results.json`), 'utf8');
      const data = JSON.parse(dataRaw);

      for (const row of data) {
        const sid = row.id;
        const query = row.query || "";
        const perAtom = row.per_atom_detail || {};

        const atomsList = Object.keys(perAtom).map(aid => ({
          id: aid,
          text: perAtom[aid].text
        }));

        const goldCores = goldCoreMap[sid] || [];

        const queryStr = `
          INSERT INTO samples (id, llm, query, atoms, gold_core_atoms)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
              llm = EXCLUDED.llm,
              query = EXCLUDED.query,
              atoms = EXCLUDED.atoms,
              gold_core_atoms = EXCLUDED.gold_core_atoms;
        `;

        await pool.query(queryStr, [
          sid, m, query, JSON.stringify(atomsList), JSON.stringify(goldCores)
        ]);
        totalUpserted++;
      }
    }

    console.log(`Successfully upserted ${totalUpserted} samples to Supabase.`);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

main();
