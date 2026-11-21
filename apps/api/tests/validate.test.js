import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { paginationQuery, toRange, paginationMeta } from '../src/utils/pagination.js';
import { sendSuccess } from '../src/utils/response.js';

const app = express();
app.use(express.json());
app.post(
  '/things/:id',
  validate({
    params: z.object({ id: z.string().uuid() }),
    query: paginationQuery,
    body: z.object({ name: z.string().trim().min(1).max(20) }).strict(),
  }),
  (req, res) => sendSuccess(req, res, req.validated, { status: 201 }),
);
app.use(errorHandler);

const ID = '123e4567-e89b-42d3-a456-426614174000';

describe('validate middleware', () => {
  it('passes valid input and exposes coerced values', async () => {
    const res = await request(app).post(`/things/${ID}?page=2`).send({ name: '  Cat  ' });
    expect(res.status).toBe(201);
    expect(res.body.data.body.name).toBe('Cat');
    expect(res.body.data.query).toEqual({ page: 2, pageSize: 20 });
  });

  it('returns VALIDATION_ERROR with field details across params, query and body', async () => {
    const res = await request(app)
      .post('/things/not-a-uuid?pageSize=999')
      .send({ name: '', extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const where = res.body.error.details.map((d) => d.in);
    expect(where).toEqual(expect.arrayContaining(['params', 'query', 'body']));
  });
});

describe('pagination helpers', () => {
  it('computes range and meta', () => {
    expect(toRange({ page: 3, pageSize: 10 })).toEqual({ from: 20, to: 29 });
    expect(paginationMeta({ page: 1, pageSize: 10 }, 25).totalPages).toBe(3);
    expect(paginationMeta({ page: 1, pageSize: 10 }, 0).totalPages).toBe(1);
  });
});
