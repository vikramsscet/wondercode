import * as csstree from 'css-tree';
import { error, warning } from './issues.js';

const BAD_PROPS = new Set(['behavior', '-moz-binding']);
const URL_FUNCS = new Set(['image-set', '-webkit-image-set', 'src', 'cross-fade']);

export function validateCss(file, css) {
  const issues = [];
  let ast;
  try {
    ast = csstree.parse(css, {
      positions: true,
      parseCustomProperty: false,
      onParseError: (e) =>
        issues.push(
          error('syntax', 'css-syntax', file, 'There is a typo in this CSS.', {
            line: e.line,
            column: e.column,
          }),
        ),
    });
  } catch {
    return [error('syntax', 'css-unparseable', file, 'This CSS is too complicated to check.')];
  }
  const at = (node) => ({ line: node.loc?.start.line, column: node.loc?.start.column });

  csstree.walk(ast, (node) => {
    if (node.type === 'Atrule' && ['import', 'namespace'].includes(node.name)) {
      issues.push(
        error(
          'dependency',
          'css-import',
          file,
          `@${node.name} is not allowed. Keep all your styles in this file.`,
          at(node),
        ),
      );
    } else if (node.type === 'Atrule' && ['font-face'].includes(node.name)) {
      issues.push(
        warning(
          'dependency',
          'css-font-face',
          file,
          'Custom fonts cannot be loaded. Use the fonts already on the page.',
          at(node),
        ),
      );
    } else if (node.type === 'Url') {
      const value = String(node.value ?? '').trim();
      if (!value.startsWith('#')) {
        issues.push(
          error(
            'dependency',
            'css-external-url',
            file,
            'Images and files from other places cannot be used.',
            at(node),
          ),
        );
      }
    } else if (node.type === 'Declaration' && BAD_PROPS.has(node.property.toLowerCase())) {
      issues.push(
        error(
          'capability',
          'css-script-property',
          file,
          `The ${node.property} property is not allowed.`,
          at(node),
        ),
      );
    } else if (node.type === 'Function') {
      const name = node.name.toLowerCase();
      if (name === 'expression') {
        issues.push(
          error('capability', 'css-expression', file, 'expression() is not allowed.', at(node)),
        );
      } else if (URL_FUNCS.has(name)) {
        issues.push(
          error(
            'dependency',
            'css-url-function',
            file,
            `${node.name}() can load outside files, so it is not allowed.`,
            at(node),
          ),
        );
      }
    }
  });
  return issues;
}
