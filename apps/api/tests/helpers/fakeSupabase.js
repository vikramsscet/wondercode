// Minimal in-memory stand-in for the supabase-js calls used by repositories + auth.
// Supports: select/insert/update with eq/is/order, maybeSingle/single and head counts.
export function createFakeSupabase({ users = {}, tables = {} } = {}) {
  const db = {
    child_profiles: [],
    parent_profiles: [],
    guest_sessions: [],
    projects: [],
    usage_events: [],
    ...tables,
  };
  let seq = 0;

  function from(name) {
    const q = { op: 'select', filters: [], patch: null, rows: null, head: false, count: false };
    const run = () => {
      const all = db[name];
      const match = (r) =>
        q.filters.every(([k, kind, v]) => {
          if (kind === 'eq') return r[k] === v;
          if (kind === 'lt') return r[k] < v;
          return (r[k] ?? null) === v;
        });
      if (q.op === 'insert') {
        const row = {
          id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
          deleted_at: null,
          ...(name === 'guest_sessions' && { status: 'active' }), // DB default
          created_at: 'now',
          updated_at: 'now',
          ...q.rows,
        };
        all.push(row);
        return [row];
      }
      const hits = all.filter(match);
      if (q.op === 'update') hits.forEach((r) => Object.assign(r, q.patch));
      if (q.op === 'delete') hits.forEach((r) => all.splice(all.indexOf(r), 1));
      return hits;
    };
    const finish = (rows, single) => {
      if (q.head) return { count: rows.length, error: null };
      if (single === 'one') return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    };
    const b = {
      select: (_cols, opts = {}) => {
        q.head = Boolean(opts.head);
        return b;
      },
      insert: (rows) => {
        q.op = 'insert';
        q.rows = rows;
        return b;
      },
      delete: () => {
        q.op = 'delete';
        return b;
      },
      lt: (k, v) => {
        q.filters.push([k, 'lt', v]);
        return b;
      },
      update: (patch) => {
        q.op = 'update';
        q.patch = patch;
        return b;
      },
      eq: (k, v) => {
        q.filters.push([k, 'eq', v]);
        return b;
      },
      is: (k, v) => {
        q.filters.push([k, 'is', v]);
        return b;
      },
      order: () => b,
      maybeSingle: async () => finish(run(), 'one'),
      single: async () => finish(run(), 'one'),
      then: (resolve, reject) => Promise.resolve(finish(run())).then(resolve, reject),
    };
    return b;
  }

  return {
    db,
    from,
    auth: {
      getUser: async (token) =>
        users[token]
          ? { data: { user: users[token] }, error: null }
          : { data: { user: null }, error: { status: 401 } },
    },
  };
}
