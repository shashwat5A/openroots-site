// Shared database connection for all /api functions.
// Vercel's Neon integration provides DATABASE_URL automatically.
import { neon } from '@neondatabase/serverless';

let sql;
export function getSql() {
  if (!sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set. Connect Neon to this Vercel project.');
    sql = neon(url);
  }
  return sql;
}
