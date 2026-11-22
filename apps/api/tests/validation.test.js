import request from 'supertest';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockAIProvider } from '../src/providers/ai/mock/MockAIProvider.js';
import { createAIService } from '../src/modules/ai/ai.service.js';
import { validateProject } from '../src/modules/validation/validateProject.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const mock = new MockAIProvider();
const sample = async (prompt = 'a quiz about space') => {
  const plan = (await mock.generateProjectPlan({ prompt, language: 'en' })).data;
  return { plan, files: (await mock.generateProjectCode({ plan })).data.files };
};
const withFile = (files, path, content) =>
  files.map((f) => (f.path === path ? { ...f, content } : f));
const codes = (r) => r.errors.map((e) => e.code);
const js = async (code) => validateProject(withFile((await sample()).files, 'script.js', code));
const html = async (code) => validateProject(withFile((await sample()).files, 'index.html', code));
const css = async (code) => validateProject(withFile((await sample()).files, 'style.css', code));

describe('validateProject: good projects', () => {
  it('accepts every sample project with a structured result', async () => {
    for (const p of ['a game', 'a quiz', 'a calculator', 'an animation', 'a website']) {
      const r = validateProject((await sample(p)).files);
      expect(r).toMatchObject({ valid: true, errors: [] });
      expect(r.summary.checked).toEqual(['index.html', 'style.css', 'script.js']);
    }
  });

  it('keeps harmless code valid', async () => {
    const r = await js(
      'let score = 0;\nconst btn = document.querySelector("button");\nbtn.addEventListener("click", () => { score += 1; });\nsetTimeout(() => {}, 100);\nwindow.addEventListener("keydown", (e) => e.key);',
    );
    expect(r.valid).toBe(true);
  });

  it('allows a variable named like a browser global when it is declared locally', async () => {
    expect(
      (await js('const parent = 1; const top = parent + 1; const open = () => top;')).valid,
    ).toBe(true);
  });
});

describe('validateProject: structure', () => {
  it('reports paths, types and sizes', async () => {
    const { files } = await sample();
    expect(codes(validateProject(files.slice(0, 2)))).toContain('path-missing');
    expect(
      codes(validateProject([...files, { path: 'a.php', language: 'html', content: 'x' }])),
    ).toContain('path-unexpected');
    expect(codes(validateProject([...files, files[0]]))).toContain('path-duplicate');
    expect(
      codes(validateProject([{ path: '../x.js', language: 'javascript', content: 'x' }])),
    ).toContain('path-invalid');
    expect(codes(validateProject(files.map((f) => ({ ...f, language: 'html' }))))).toContain(
      'type-mismatch',
    );
    expect(codes(await js(''))).toContain('size-empty');
    expect(codes(await js('a'.repeat(200 * 1024 + 1)))).toContain('size-file');
    expect(codes(validateProject(null))).toContain('path-missing');
  });
});

describe('validateProject: syntax errors with locations', () => {
  it('JavaScript', async () => {
    const r = await js('let a = 1;\nlet b = ;\n');
    expect(r.errors[0]).toMatchObject({
      code: 'js-syntax',
      file: 'script.js',
      line: 2,
      category: 'syntax',
    });
    expect(r.errors[0].message).toMatch(/typo/);
  });

  it('CSS', async () => {
    const r = await css('body { color: red; }\n}}} {{');
    expect(codes(r)).toContain('css-syntax');
  });

  it('HTML (unfinished tag)', async () => {
    const r = await html('<!doctype html><html><body><p>hi</p><div class="x');
    expect(r.errors.some((e) => e.category === 'syntax' && e.file === 'index.html')).toBe(true);
  });

  it('import/export are reported as a dependency problem, not a typo', async () => {
    expect(codes(await js('import x from "./y.js";'))).toEqual(['js-module']);
  });

  it('does not crash on absurdly nested input', async () => {
    const r = await js('['.repeat(50000));
    expect(r.valid).toBe(false);
  });
});

describe('validateProject: disallowed JavaScript capabilities', () => {
  it.each([
    ['eval("1")', 'js-dynamic'],
    ['new Function("return 1")()', 'js-dynamic'],
    ['(() => {}).constructor("x")()', 'js-dynamic'],
    ['setTimeout("alert(1)", 10)', 'js-timer-string'],
    ['fetch("/x")', 'js-network'],
    ['window.fetch("/x")', 'js-network'],
    ['window["fetch"]("/x")', 'js-network'],
    ['window["fe" + "tch"]("/x")', 'js-dynamic-access'],
    ['const w = window; w.x = 1;', 'js-global-alias'],
    ['const { fetch: f } = globalThis;', 'js-global-alias'],
    ['new XMLHttpRequest()', 'js-network'],
    ['new WebSocket("x")', 'js-network'],
    ['navigator.sendBeacon("x")', 'js-network'],
    ['new Worker("w.js")', 'js-worker'],
    ['localStorage.setItem("a", "b")', 'js-storage'],
    ['window.sessionStorage', 'js-storage'],
    ['document.cookie = "a=b"', 'js-document-access'],
    ['document.write("x")', 'js-document-access'],
    ['navigator.geolocation.getCurrentPosition(() => {})', 'js-device'],
    ['navigator.mediaDevices.getUserMedia({})', 'js-device'],
    ['window.open("x")', 'js-window-access'],
    ['location.href = "x"', 'js-navigation'],
    ['window.location = "x"', 'js-window-access'],
    ['top.location', 'js-window-access'],
    ['parent.postMessage("x", "*")', 'js-messaging'],
    ['import("x")', 'js-import'],
    ['require("fs")', 'js-module'],
    ['with (Math) { max(1, 2); }', 'js-with'],
    ['document.createElement("script")', 'js-element'],
    ['document.createElement("iframe")', 'js-element'],
    ['const u = "https://evil.example/a";', 'js-external-url'],
    ['const u = `//evil.example/${1}`;', 'js-external-url'],
  ])('rejects %s', async (code, expected) => {
    const r = await js(code);
    expect(r.valid).toBe(false);
    expect(codes(r)).toContain(expected);
  });

  it('warns (but allows) innerHTML and possible infinite loops', async () => {
    const r = await js('el.innerHTML = "<b>hi</b>";\nwhile (true) { x++; }');
    expect(r.valid).toBe(true);
    expect(r.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['js-html-sink', 'js-infinite-loop']),
    );
    expect((await js('while (true) { if (x) break; }')).warnings).toHaveLength(0);
  });
});

describe('validateProject: disallowed HTML and CSS', () => {
  it.each([
    ['<script src="https://cdn.example/x.js"></script>', 'html-script'],
    ['<script>alert(1)</script>', 'html-script'],
    ['<iframe src="script.js"></iframe>', 'html-tag-iframe'],
    ['<object data="x"></object>', 'html-tag-object'],
    ['<form action="script.js"></form>', 'html-tag-form'],
    ['<img src="//evil.example/a.png">', 'html-external-resource'],
    ['<img src="data:image/png;base64,AAAA">', 'html-external-resource'],
    ['<a href="javascript:alert(1)">x</a>', 'html-javascript-url'],
    ['<link rel="stylesheet" href="https://fonts.example/f.css">', 'html-link'],
    ['<link rel="icon" href="x.ico">', 'html-link'],
    ['<button onclick="go()">x</button>', 'html-inline-handler'],
    ['<meta http-equiv="refresh" content="0;url=x">', 'html-meta-refresh'],
    ['<base href="/">', 'html-tag-base'],
    ['<template><iframe></iframe></template>', 'html-tag-iframe'],
  ])('HTML rejects %s', async (body, expected) => {
    const r = await html(
      `<!doctype html><html><head><title>t</title></head><body>${body}</body></html>`,
    );
    expect(codes(r)).toContain(expected);
  });

  it.each([
    ['@import url("x.css");', 'css-import'],
    ['body { background: url(https://x.example/a.png); }', 'css-external-url'],
    ['body { background: url("a.png"); }', 'css-external-url'],
    ['body { width: expression(alert(1)); }', 'css-expression'],
    ['body { behavior: url(x.htc); }', 'css-script-property'],
    ['body { background: image-set("a.png" 1x); }', 'css-url-function'],
  ])('CSS rejects %s', async (code, expected) => {
    expect(codes(await css(code))).toContain(expected);
  });

  it('CSS allows fragment urls and normal styles', async () => {
    expect(
      (
        await css(
          'body { color: red; } .a { fill: url(#grad); } @media (min-width: 1px) { a { color: blue; } }',
        )
      ).valid,
    ).toBe(true);
  });
});

describe('API', () => {
  const PARENT = { id: '123e4567-e89b-42d3-a456-426614174001' };
  const CHILD = '123e4567-e89b-42d3-a456-426614174099';
  const silent = { warn() {}, info() {}, error() {} };
  function setup(provider) {
    const supabase = createFakeSupabase({
      users: { a: PARENT },
      tables: {
        child_profiles: [
          {
            id: CHILD,
            parent_id: PARENT.id,
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
    const config = loadConfig({ AI_RETRY_BASE_MS: '0' });
    const deps = { supabase };
    if (provider) deps.ai = createAIService({ provider, config, supabase, logger: silent });
    const app = createApp(config, pino({ level: 'silent' }), deps);
    const post = (path, body) =>
      request(app)
        .post(`/api/v1${path}`)
        .set('Authorization', 'Bearer a')
        .set('X-Child-Id', CHILD)
        .send(body);
    return { app, supabase, post };
  }

  it('POST /projects/validate returns issues without saving', async () => {
    const { post, supabase } = setup();
    const { files } = await sample();
    const ok = await post('/projects/validate', { files });
    expect(ok.status).toBe(200);
    expect(ok.body.data.valid).toBe(true);
    const bad = await post('/projects/validate', {
      files: withFile(files, 'script.js', 'fetch("x")'),
    });
    expect(bad.status).toBe(200);
    expect(bad.body.data.valid).toBe(false);
    expect(bad.body.data.errors[0]).toMatchObject({ file: 'script.js', category: 'dependency' });
    expect(supabase.db.projects).toHaveLength(0);
  });

  it('POST /projects/validate needs auth and a valid body', async () => {
    const { app, post } = setup();
    expect((await request(app).post('/api/v1/projects/validate').send({})).status).toBe(401);
    expect((await post('/projects/validate', { files: [] })).status).toBe(400);
  });

  it('retries once when generated code fails validation, then saves the good attempt', async () => {
    let calls = 0;
    class Flaky extends MockAIProvider {
      async generateProjectCode(input) {
        const r = await super.generateProjectCode(input);
        calls += 1;
        if (calls === 1) r.data.files[2].content = 'let x = ;';
        return r;
      }
    }
    const { post, supabase } = setup(new Flaky());
    const { plan } = await sample();
    const res = await post('/projects/generate', { plan });
    expect(res.status).toBe(201);
    expect(calls).toBe(2);
    expect(res.body.data.validated).toBe(true);
    expect(supabase.db.projects).toHaveLength(1);
  });

  it('fails after two bad attempts and saves nothing', async () => {
    let calls = 0;
    class AlwaysBad extends MockAIProvider {
      async generateProjectCode(input) {
        const r = await super.generateProjectCode(input);
        calls += 1;
        r.data.files[2].content = 'eval("1")';
        return r;
      }
    }
    const { post, supabase } = setup(new AlwaysBad());
    const { plan } = await sample();
    const res = await post('/projects/generate', { plan });
    expect(res.status).toBe(502);
    expect(calls).toBe(2);
    expect(JSON.stringify(res.body)).not.toContain('eval');
    expect(supabase.db.projects).toHaveLength(0);
  });

  it('GET /projects/:id re-validates and includes the result', async () => {
    const { post, app } = setup();
    const { plan } = await sample();
    const { project } = (await post('/projects/generate', { plan })).body.data;
    const res = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set('Authorization', 'Bearer a')
      .set('X-Child-Id', CHILD);
    expect(res.body.data.validation.valid).toBe(true);
    expect(res.body.data.validated).toBe(true);
  });
});
