import request from 'supertest';
import pino from 'pino';
import { MAX_CHILDREN_PER_PARENT } from '@wondercode/shared';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const A = { id: '123e4567-e89b-42d3-a456-426614174001', email: 'a@example.com' };
const B = { id: '123e4567-e89b-42d3-a456-426614174002', email: 'b@example.com' };

function setup() {
  const supabase = createFakeSupabase({ users: { 'token-a': A, 'token-b': B } });
  const app = createApp(loadConfig({}), pino({ level: 'silent' }), { supabase });
  const as = (token) => ({
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
    patch: (url, body) =>
      request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  });
  return { supabase, app, a: as('token-a'), b: as('token-b') };
}

const valid = { displayName: 'Mia', age: 9, avatarKey: 'fox' };

describe('children API', () => {
  it('requires authentication', async () => {
    const { app } = setup();
    expect((await request(app).get('/api/v1/children')).status).toBe(401);
    expect((await request(app).post('/api/v1/children').send(valid)).status).toBe(401);
  });

  it('creates, lists, reads, updates and deletes a child', async () => {
    const { a } = setup();
    const created = await a.post('/api/v1/children', { ...valid, interests: ['games', 'space'] });
    expect(created.status).toBe(201);
    const child = created.body.data;
    expect(child).toMatchObject({
      displayName: 'Mia',
      age: 9,
      avatarKey: 'fox',
      explanationLanguage: 'en',
      interests: ['games', 'space'],
    });
    expect(child).not.toHaveProperty('parent_id');
    expect(child).not.toHaveProperty('parentId');

    expect((await a.get('/api/v1/children')).body.data).toHaveLength(1);
    expect((await a.get(`/api/v1/children/${child.id}`)).body.data.id).toBe(child.id);

    const updated = await a.patch(`/api/v1/children/${child.id}`, { age: 10, avatarKey: 'owl' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ age: 10, avatarKey: 'owl', displayName: 'Mia' });

    expect((await a.delete(`/api/v1/children/${child.id}`)).body.data).toEqual({
      id: child.id,
      deleted: true,
    });
    expect((await a.get('/api/v1/children')).body.data).toHaveLength(0);
    expect((await a.get(`/api/v1/children/${child.id}`)).status).toBe(404);
  });

  it("never exposes or modifies another parent's child (404, not 403)", async () => {
    const { a, b } = setup();
    const { id } = (await a.post('/api/v1/children', valid)).body.data;
    expect((await b.get('/api/v1/children')).body.data).toEqual([]);
    expect((await b.get(`/api/v1/children/${id}`)).status).toBe(404);
    expect((await b.patch(`/api/v1/children/${id}`, { displayName: 'Hacked' })).status).toBe(404);
    expect((await b.delete(`/api/v1/children/${id}`)).status).toBe(404);
    expect((await a.get(`/api/v1/children/${id}`)).body.data.displayName).toBe('Mia');
  });

  it('rejects invalid input', async () => {
    const { a } = setup();
    const bad = [
      { ...valid, age: 7 },
      { ...valid, age: 13 },
      { ...valid, age: 9.5 },
      { ...valid, displayName: '   ' },
      { ...valid, displayName: 'x'.repeat(31) },
      { ...valid, avatarKey: 'not-an-avatar' },
      { ...valid, explanationLanguage: 'fr' },
      { ...valid, interests: ['games', 'games'] },
      { ...valid, interests: ['my secret'] },
      { ...valid, interests: ['games', 'animals', 'space', 'music', 'art', 'sports'] },
      { ...valid, parentId: 'x' },
      { displayName: 'Mia' },
    ];
    for (const body of bad) {
      const res = await a.post('/api/v1/children', body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects empty updates and bad ids', async () => {
    const { a } = setup();
    const { id } = (await a.post('/api/v1/children', valid)).body.data;
    expect((await a.patch(`/api/v1/children/${id}`, {})).status).toBe(400);
    expect((await a.patch(`/api/v1/children/${id}`, { age: 20 })).status).toBe(400);
    expect((await a.get('/api/v1/children/not-a-uuid')).status).toBe(400);
  });

  it(`limits a parent to ${MAX_CHILDREN_PER_PARENT} children`, async () => {
    const { a, b } = setup();
    for (let i = 0; i < MAX_CHILDREN_PER_PARENT; i += 1) {
      expect((await a.post('/api/v1/children', { ...valid, displayName: `Kid ${i}` })).status).toBe(
        201,
      );
    }
    const over = await a.post('/api/v1/children', valid);
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('CHILD_LIMIT_REACHED');
    expect((await b.post('/api/v1/children', valid)).status).toBe(201);
  });

  it('frees a slot when a child is deleted', async () => {
    const { a } = setup();
    const ids = [];
    for (let i = 0; i < MAX_CHILDREN_PER_PARENT; i += 1) {
      ids.push(
        (await a.post('/api/v1/children', { ...valid, displayName: `Kid ${i}` })).body.data.id,
      );
    }
    await a.delete(`/api/v1/children/${ids[0]}`);
    expect((await a.post('/api/v1/children', valid)).status).toBe(201);
  });
});
