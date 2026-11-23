// Minimal in-memory stand-in for the supabase-js calls used by repositories + auth.
// Supports: select/insert/update with eq/is/order, maybeSingle/single and head counts.
export function createFakeSupabase({ users = {}, tables = {}, failInsert, failUpload } = {}) {
  const opts = { failInsert };
  const objects = new Map(); // fake Storage: key -> text
  const db = {
    child_profiles: [],
    parent_profiles: [],
    guest_sessions: [],
    projects: [],
    usage_events: [],
    project_versions: [],
    project_files: [],
    code_explanations: [],
    teacher_conversations: [],
    teacher_messages: [],
    ...tables,
  };
  let seq = 0;

  function from(name) {
    const q = {
      op: 'select',
      filters: [],
      patch: null,
      rows: null,
      head: false,
      count: false,
      order: null,
    };
    const run = () => {
      const all = db[name];
      const match = (r) =>
        q.filters.every(([k, kind, v]) => {
          if (kind === 'eq') return r[k] === v;
          if (kind === 'lt') return r[k] < v;
          if (kind === 'gte') return r[k] >= v;
          return (r[k] ?? null) === v;
        });
      if (q.op === 'insert') {
        // Like supabase-js, a bulk insert uses the union of all keys; missing ones become NULL.
        const rowsIn = [q.rows].flat();
        const keys = [...new Set(rowsIn.flatMap((r) => Object.keys(r)))];
        const filled = rowsIn.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null])));
        if (name === 'teacher_messages' && filled.some((r) => r.is_mock === null)) {
          throw new Error('null value in column "is_mock" violates not-null constraint');
        }
        const made = filled.map((r) => ({
          id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
          deleted_at: null,
          ...(name === 'guest_sessions' && { status: 'active' }), // DB default
          ...(name === 'projects' && { status: 'active', current_version_id: null }),
          created_at: 'now',
          updated_at: 'now',
          ...r,
        }));
        if (opts.failInsert?.(name, made)) throw new Error('injected failure');
        all.push(...made);
        return made;
      }
      const hits = all.filter(match);
      if (q.order) {
        const [col, dir] = q.order;
        hits.sort((a, b) => (a[col] < b[col] ? -dir : a[col] > b[col] ? dir : 0));
      }
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
      gte: (k, v) => {
        q.filters.push([k, 'gte', v]);
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
      order: (col, o = {}) => {
        q.order = [col, o.ascending === false ? -1 : 1];
        return b;
      },
      maybeSingle: async () => finish(run(), 'one'),
      single: async () => finish(run(), 'one'),
      then: (resolve, reject) => Promise.resolve(finish(run())).then(resolve, reject),
    };
    return b;
  }

  const storage = {
    from: () => ({
      upload: async (key, body) => {
        if (failUpload?.(key)) return { error: new Error('upload failed') };
        objects.set(key, Buffer.from(body).toString('utf8'));
        return { error: null };
      },
      remove: async (keys) => {
        keys.forEach((k) => objects.delete(k));
        return { error: null };
      },
      download: async (key) =>
        objects.has(key)
          ? { data: { text: async () => objects.get(key) }, error: null }
          : { data: null, error: new Error('not found') },
    }),
  };

  return {
    db,
    objects,
    storage,
    from,
    auth: {
      getUser: async (token) =>
        users[token]
          ? { data: { user: users[token] }, error: null }
          : { data: { user: null }, error: { status: 401 } },
    },
  };
}
