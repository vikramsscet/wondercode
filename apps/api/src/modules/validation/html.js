import { parse } from 'parse5';
import { error, warning } from './issues.js';

const FORBIDDEN_TAGS = new Set([
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'base',
  'applet',
  'form',
  'portal',
]);
const URL_ATTRS = new Set([
  'src',
  'href',
  'action',
  'formaction',
  'data',
  'poster',
  'srcset',
  'xlink:href',
  'background',
  'ping',
  'manifest',
  'cite',
]);
const OWN_FILES = new Set(['style.css', 'script.js']);
// parse5 reports many small slips browsers forgive; only these stop the page from working properly.
const SERIOUS = (code) =>
  code.startsWith('eof-') ||
  ['missing-attribute-value', 'missing-end-tag-name', 'unexpected-null-character'].includes(code);

const attrMap = (node) =>
  Object.fromEntries(node.attrs.map((a) => [a.name.toLowerCase(), a.value]));

export function validateHtml(file, html) {
  const issues = [];
  const at = (loc) => ({ line: loc?.startLine, column: loc?.startCol });
  let tree;
  try {
    tree = parse(html, {
      sourceCodeLocationInfo: true,
      onParseError: (e) =>
        issues.push(
          (SERIOUS(e.code) ? error : warning)(
            'syntax',
            `html-${e.code}`,
            file,
            SERIOUS(e.code)
              ? 'The HTML is not finished or has a typo here.'
              : 'The HTML could be tidier here.',
            { line: e.startLine, column: e.startCol },
          ),
        ),
    });
  } catch {
    return [error('syntax', 'html-unparseable', file, 'This HTML is too complicated to check.')];
  }

  const visit = (node, depth = 0) => {
    if (depth > 500) {
      issues.push(error('syntax', 'html-too-deep', file, 'The HTML is nested too deeply.'));
      return;
    }
    if (node.tagName) checkElement(node);
    for (const child of node.childNodes ?? []) visit(child, depth + 1);
    if (node.content) visit(node.content, depth + 1); // <template>
  };

  function checkElement(node) {
    const tag = node.tagName;
    const attrs = attrMap(node);
    const loc = at(node.sourceCodeLocation);

    if (FORBIDDEN_TAGS.has(tag)) {
      issues.push(
        error(
          'capability',
          `html-tag-${tag}`,
          file,
          `The <${tag}> tag is not allowed in WonderCode projects.`,
          loc,
        ),
      );
    }
    if (tag === 'meta' && (attrs['http-equiv'] ?? '').toLowerCase() === 'refresh') {
      issues.push(
        error(
          'capability',
          'html-meta-refresh',
          file,
          'Pages cannot redirect or reload themselves.',
          loc,
        ),
      );
    }
    if (tag === 'script') {
      if (attrs.src !== 'script.js' || node.childNodes.length > 0) {
        issues.push(
          error(
            'dependency',
            'html-script',
            file,
            'Put your JavaScript in script.js and load it with <script src="script.js">.',
            loc,
          ),
        );
      }
    } else if (tag === 'link') {
      if ((attrs.rel ?? '').toLowerCase() !== 'stylesheet' || attrs.href !== 'style.css') {
        issues.push(
          error(
            'dependency',
            'html-link',
            file,
            'Only <link rel="stylesheet" href="style.css"> is allowed.',
            loc,
          ),
        );
      }
    } else if (tag === 'style') {
      issues.push(
        warning('syntax', 'html-inline-style', file, 'Try putting your styles in style.css.', loc),
      );
    }
    for (const [name, value] of Object.entries(attrs)) {
      if (name.startsWith('on')) {
        issues.push(
          error(
            'capability',
            'html-inline-handler',
            file,
            'Use addEventListener in script.js instead of attributes like onclick.',
            loc,
          ),
        );
      } else if (URL_ATTRS.has(name)) {
        const v = value.trim();
        if (/^\s*(?:javascript|vbscript):/i.test(v)) {
          issues.push(
            error(
              'capability',
              'html-javascript-url',
              file,
              'javascript: links are not allowed.',
              loc,
            ),
          );
        } else if (!OWN_FILES.has(v) && !/^#[\w-]*$/.test(v)) {
          issues.push(
            error(
              'dependency',
              'html-external-resource',
              file,
              'Pages can only use style.css, script.js and links inside the page.',
              loc,
            ),
          );
        }
      }
    }
  }

  visit(tree);
  return issues;
}
