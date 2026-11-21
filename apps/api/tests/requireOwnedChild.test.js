import express from 'express';
import request from 'supertest';
import { requireAuth } from '../src/middleware/requireAuth.js';
import { requireOwnedChild } from '../src/middleware/requireOwnedChild.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const A = { id: '123e4567-e89b-42d3-a456-426614174001' };
const B = { id: '123e4567-e89b-42d3-a456-426614174002' };
const CHILD = '123e4567-e89b-42d3-a456-426614174099';

function build() {
  const supabase = createFakeSupabase({
    users: { a: A, b: B },
    tables: {
      child_profiles: [
        {
          id: CHILD,
          parent_id: A.id,
          display_name: 'Mia',
          age: 9,
          avatar_key: 'fox',
          explanation_language: 'en',
          interests: [],
          deleted_at: null,
        },
      ],
    },
  });
  const app = express();
  app.locals.supabase = supabase;
  app.get('/active', requireAuth, requireOwnedChild, (req, res) => res.json({ id: req.child.id }));
  app.use(errorHandler);
  return app;
}

describe('requireOwnedChild with X-Child-Id header', () => {
  it('accepts the parent’s own child', async () => {
    const res = await request(build())
      .get('/active')
      .set('Authorization', 'Bearer a')
      .set('X-Child-Id', CHILD);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(CHILD);
  });

  it('rejects another parent’s child with 404', async () => {
    const res = await request(build())
      .get('/active')
      .set('Authorization', 'Bearer b')
      .set('X-Child-Id', CHILD);
    expect(res.status).toBe(404);
  });

  it('rejects a missing or malformed header with 400', async () => {
    const app = build();
    expect((await request(app).get('/active').set('Authorization', 'Bearer a')).status).toBe(400);
    expect(
      (await request(app).get('/active').set('Authorization', 'Bearer a').set('X-Child-Id', 'x'))
        .status,
    ).toBe(400);
  });
});
