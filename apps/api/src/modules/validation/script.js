import * as acorn from 'acorn';
import { error, warning } from './issues.js';

// Static checks on JavaScript. The code is parsed and walked, NEVER executed.
// This is one defence layer; the real boundary is the sandboxed preview (blueprint section 9.1).

const WINDOWS = new Set(['window', 'self', 'globalThis', 'top', 'parent', 'frames', 'opener']);
// Names that mean network, storage, workers or device access, whether used alone or as a property.
const API_NAMES = {
  network: [
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'sendBeacon',
    'importScripts',
    'RTCPeerConnection',
    'WebTransport',
  ],
  worker: [
    'Worker',
    'SharedWorker',
    'ServiceWorker',
    'serviceWorker',
    'BroadcastChannel',
    'MessageChannel',
  ],
  storage: ['localStorage', 'sessionStorage', 'indexedDB', 'openDatabase', 'caches', 'cookieStore'],
  device: [
    'geolocation',
    'mediaDevices',
    'getUserMedia',
    'clipboard',
    'showOpenFilePicker',
    'showSaveFilePicker',
    'bluetooth',
    'usb',
    'serial',
  ],
  messaging: ['postMessage'],
  module: ['require'],
  dynamic: ['eval', 'Function', 'constructor'],
};
const API_CATEGORY = new Map(
  Object.entries(API_NAMES).flatMap(([group, names]) => names.map((n) => [n, group])),
);
const GROUP_INFO = {
  network: ['dependency', 'Programs cannot talk to the internet.'],
  worker: ['capability', 'Background workers are not allowed.'],
  storage: ['capability', 'Saving data in the browser is not allowed.'],
  device: ['capability', 'Cameras, microphones, location and the clipboard are not allowed.'],
  messaging: ['capability', 'Sending messages between windows is not allowed.'],
  module: ['dependency', 'Loading other files or libraries is not allowed.'],
  dynamic: ['capability', 'Building code from text is not allowed.'],
};
// Extra names that are only a problem on window-like objects.
const WINDOW_ONLY = new Set(['open', 'location', 'opener', 'top', 'parent', 'frames', 'close']);
const DOCUMENT_BANNED = new Set(['write', 'writeln', 'cookie', 'domain', 'location', 'open']);
const BAD_ELEMENTS = new Set([
  'script',
  'iframe',
  'frame',
  'object',
  'embed',
  'link',
  'base',
  'meta',
]);
const HTML_SINKS = new Set(['innerHTML', 'outerHTML', 'insertAdjacentHTML']);
const EXTERNAL_STRING =
  /(?:https?:|wss?:|ftp:|javascript:|vbscript:)|^\s*\/\/[a-z0-9]|data:text\/html/i;
const MAX_NODES = 200_000;

const loc = (node) => ({ line: node.loc?.start.line, column: node.loc?.start.column + 1 });

function patternNames(pattern, out) {
  if (!pattern) return;
  switch (pattern.type) {
    case 'Identifier':
      out.add(pattern.name);
      break;
    case 'ObjectPattern':
      pattern.properties.forEach((p) => patternNames(p.value ?? p.argument, out));
      break;
    case 'ArrayPattern':
      pattern.elements.forEach((e) => patternNames(e, out));
      break;
    case 'RestElement':
      patternNames(pattern.argument, out);
      break;
    case 'AssignmentPattern':
      patternNames(pattern.left, out);
      break;
    default:
  }
}

// Generic child traversal with parent tracking (iterative, so deep code cannot overflow the stack).
function traverse(root, visit) {
  const stack = [[root, null]];
  let count = 0;
  while (stack.length) {
    const [node, parent] = stack.pop();
    if (++count > MAX_NODES) return false;
    visit(node, parent);
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'type') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (let i = value.length - 1; i >= 0; i -= 1) {
          if (value[i] && typeof value[i].type === 'string') stack.push([value[i], node]);
        }
      } else if (value && typeof value.type === 'string') {
        stack.push([value, node]);
      }
    }
  }
  return true;
}

function parseScript(file, code) {
  const options = { ecmaVersion: 'latest', locations: true, allowHashBang: false };
  try {
    return { ast: acorn.parse(code, { ...options, sourceType: 'script' }) };
  } catch (err) {
    if (err instanceof RangeError) {
      return {
        issue: error('syntax', 'js-too-complex', file, 'This code is nested too deeply to check.'),
      };
    }
    // import/export only parse as modules: report that as the real problem.
    try {
      acorn.parse(code, { ...options, sourceType: 'module' });
      return {
        issue: error(
          'dependency',
          'js-module',
          file,
          'import and export are not allowed. Keep everything in script.js.',
          {
            line: err.loc?.line,
            column: err.loc ? err.loc.column + 1 : null,
          },
        ),
      };
    } catch {
      // fall through to the original syntax error
    }
    return {
      issue: error(
        'syntax',
        'js-syntax',
        file,
        `There is a typo in your code: ${String(err.message).replace(/\s*\(\d+:\d+\)$/, '')}.`,
        {
          line: err.loc?.line,
          column: err.loc ? err.loc.column + 1 : null,
        },
      ),
    };
  }
}

export function validateScript(file, code) {
  const parsed = parseScript(file, code);
  if (parsed.issue) return [parsed.issue];
  const issues = [];
  const add = (sev, cat, c, msg, node) =>
    issues.push((sev === 'error' ? error : warning)(cat, c, file, msg, loc(node)));

  // Pass 1: names the program declares itself (these shadow browser globals).
  const declared = new Set();
  traverse(parsed.ast, (n) => {
    if (n.type === 'VariableDeclarator') patternNames(n.id, declared);
    else if (
      ['FunctionDeclaration', 'FunctionExpression', 'ClassDeclaration', 'ClassExpression'].includes(
        n.type,
      )
    ) {
      if (n.id) declared.add(n.id.name);
      (n.params ?? []).forEach((p) => patternNames(p, declared));
    } else if (n.type === 'ArrowFunctionExpression')
      n.params.forEach((p) => patternNames(p, declared));
    else if (n.type === 'CatchClause') patternNames(n.param, declared);
  });
  const isGlobal = (name) => !declared.has(name);

  const flagName = (name, node, how) => {
    const group = API_CATEGORY.get(name);
    if (!group) return false;
    const [category, text] = GROUP_INFO[group];
    add('error', category, `js-${group}`, `${text} (${how} ${name})`, node);
    return true;
  };

  const complete = traverse(parsed.ast, (node, parent) => {
    switch (node.type) {
      case 'WithStatement':
        add('error', 'capability', 'js-with', 'The with statement is not allowed.', node);
        break;
      case 'ImportExpression':
        add(
          'error',
          'dependency',
          'js-import',
          'Loading other files with import() is not allowed.',
          node,
        );
        break;
      case 'Identifier': {
        const isMemberProp =
          parent?.type === 'MemberExpression' && parent.property === node && !parent.computed;
        const isKey =
          (parent?.type === 'Property' ||
            parent?.type === 'MethodDefinition' ||
            parent?.type === 'PropertyDefinition') &&
          parent.key === node &&
          !parent.computed &&
          !(parent.shorthand && parent.value === node);
        const isLabelOrDecl =
          ['LabeledStatement', 'BreakStatement', 'ContinueStatement'].includes(parent?.type) ||
          ((parent?.type === 'VariableDeclarator' ||
            parent?.type === 'FunctionDeclaration' ||
            parent?.type === 'ClassDeclaration') &&
            parent.id === node);
        if (isKey || isLabelOrDecl) break;
        if (isMemberProp) {
          flagName(node.name, node, 'using');
        } else if (isGlobal(node.name)) {
          if (flagName(node.name, node, 'using')) break;
          if (node.name === 'location') {
            add(
              'error',
              'capability',
              'js-navigation',
              'Changing or reading the page address is not allowed.',
              node,
            );
          } else if (WINDOWS.has(node.name)) {
            // window/self/globalThis may only be used as `window.something` (checked below).
            const okUse = parent?.type === 'MemberExpression' && parent.object === node;
            if (!okUse)
              add(
                'error',
                'capability',
                'js-global-alias',
                `Using ${node.name} on its own is not allowed. Write ${node.name}.something instead.`,
                node,
              );
          } else if (
            WINDOW_ONLY.has(node.name) &&
            parent?.type === 'CallExpression' &&
            parent.callee === node
          ) {
            add(
              'error',
              'capability',
              'js-window-call',
              `Calling ${node.name}() is not allowed.`,
              node,
            );
          }
        }
        break;
      }
      case 'MemberExpression': {
        const obj = node.object;
        const key = node.computed
          ? node.property.type === 'Literal'
            ? String(node.property.value)
            : null
          : node.property.name;
        const onWindow = obj.type === 'Identifier' && WINDOWS.has(obj.name) && isGlobal(obj.name);
        const onDocument =
          obj.type === 'Identifier' && obj.name === 'document' && isGlobal('document');
        if (node.computed && key !== null) flagName(key, node.property, 'using');
        if (node.computed && key === null && onWindow) {
          add(
            'error',
            'capability',
            'js-dynamic-access',
            'Looking up window properties by a computed name is not allowed.',
            node,
          );
        }
        if (
          node.computed &&
          key === null &&
          node.property.type !== 'Literal' &&
          ['constructor'].includes(key)
        ) {
          add('error', 'capability', 'js-dynamic', 'Building code from text is not allowed.', node);
        }
        if (onWindow && key && WINDOW_ONLY.has(key)) {
          const nav =
            key === 'location' || key === 'open'
              ? 'Opening windows or changing the page address is not allowed.'
              : 'Reaching other windows is not allowed.';
          add('error', 'capability', 'js-window-access', nav, node);
        }
        if (onDocument && key && DOCUMENT_BANNED.has(key)) {
          add('error', 'capability', 'js-document-access', `document.${key} is not allowed.`, node);
        }
        if (
          key &&
          HTML_SINKS.has(key) &&
          (parent?.type === 'AssignmentExpression' || parent?.type === 'CallExpression')
        ) {
          add(
            'warning',
            'capability',
            'js-html-sink',
            `Setting ${key} builds HTML from text. Prefer textContent.`,
            node,
          );
        }
        break;
      }
      case 'CallExpression': {
        const c = node.callee;
        const name =
          c.type === 'Identifier'
            ? c.name
            : c.type === 'MemberExpression' && !c.computed
              ? c.property.name
              : null;
        const [first] = node.arguments;
        if (
          ['setTimeout', 'setInterval'].includes(name) &&
          first &&
          ['Literal', 'TemplateLiteral', 'BinaryExpression'].includes(first.type) &&
          !(first.type === 'Literal' && typeof first.value !== 'string')
        ) {
          add(
            'error',
            'capability',
            'js-timer-string',
            `${name} needs a function, not text.`,
            node,
          );
        }
        if (
          name === 'createElement' &&
          first?.type === 'Literal' &&
          BAD_ELEMENTS.has(String(first.value).toLowerCase())
        ) {
          add(
            'error',
            'capability',
            'js-element',
            `Creating <${first.value}> elements is not allowed.`,
            node,
          );
        }
        break;
      }
      case 'Literal':
        if (typeof node.value === 'string' && EXTERNAL_STRING.test(node.value)) {
          add(
            'error',
            'dependency',
            'js-external-url',
            'Links to other websites are not allowed in code.',
            node,
          );
        }
        break;
      case 'TemplateElement':
        if (EXTERNAL_STRING.test(node.value.cooked ?? node.value.raw)) {
          add(
            'error',
            'dependency',
            'js-external-url',
            'Links to other websites are not allowed in code.',
            node,
          );
        }
        break;
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'ForStatement': {
        const test = node.test;
        const forever = !test || (test.type === 'Literal' && Boolean(test.value));
        if (forever && !exitsLoop(node.body)) {
          add(
            'warning',
            'capability',
            'js-infinite-loop',
            'This loop may never stop and could freeze the page.',
            node,
          );
        }
        break;
      }
      default:
    }
  });
  if (!complete)
    issues.push(error('syntax', 'js-too-complex', file, 'This code is too big to check.'));
  return issues;
}

// True if the loop body can leave the loop (break/return/throw), ignoring nested functions.
function exitsLoop(body) {
  let exits = false;
  const stack = [body];
  while (stack.length && !exits) {
    const n = stack.pop();
    if (!n || typeof n.type !== 'string') continue;
    if (['BreakStatement', 'ReturnStatement', 'ThrowStatement'].includes(n.type)) exits = true;
    if (/Function/.test(n.type)) continue;
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) stack.push(...v);
      else if (v && typeof v.type === 'string') stack.push(v);
    }
  }
  return exits;
}
