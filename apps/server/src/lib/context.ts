import type { Context as HonoContext } from 'hono';
import { createDb } from '../db';
import type { AppContext } from '../index';

type CreateContextOptions = {
  context: HonoContext<AppContext>;
};

// 將hono的context轉換成orpc的context
export async function createContext({ context }: CreateContextOptions): Promise<{
  session: null;
  db: ReturnType<typeof createDb>;
  env: typeof context.env;
  liffUser?: { userId: string; accessToken: string };
}> {
  const liffUser = context.get('liffUser');

  return {
    session: null,
    db: createDb(context.env.DB),
    env: context.env,
    liffUser,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
