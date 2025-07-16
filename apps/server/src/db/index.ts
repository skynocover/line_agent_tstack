import { env } from 'cloudflare:workers';
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export const db = drizzle(env.DB);

export const createDb = (database: D1Database) => {
  return drizzle(database, { schema });
};

export type Database = ReturnType<typeof createDb>;
