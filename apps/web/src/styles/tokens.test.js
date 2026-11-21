import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

// Parse the design tokens from the CSS so the test cannot drift from the real theme.
const css = readFileSync(resolvePath(process.cwd(), 'src/styles/index.css'), 'utf8');
const color = (name) => {
  const hex = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
  if (!hex) throw new Error(`Missing token ${name}`);
  return hex;
};

const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background] pairs used by the UI components (WCAG AA for normal text = 4.5).
const WHITE = '#ffffff';
const pairs = [
  [WHITE, 'brand-600'], // primary button
  [WHITE, 'brand-700'], // primary hover
  [WHITE, 'coral-600'], // danger button
  ['brand-800', 'brand-100'], // secondary button, info alert, badge
  ['brand-700', 'brand-50'], // ghost hover
  ['brand-700', WHITE], // links
  ['ink-900', 'ink-50'], // body text
  ['ink-600', WHITE], // secondary text
  ['ink-500', WHITE], // placeholder text
  ['sun-800', 'sun-100'], // warning alert, sun card
  ['mint-700', 'mint-100'], // success alert
  ['coral-700', 'coral-100'], // error alert
  ['coral-700', WHITE], // field error text
];
const resolve = (v) => (v.startsWith('#') ? v : color(v));

describe('design tokens', () => {
  it.each(pairs)('%s on %s meets WCAG AA contrast', (fg, bg) => {
    expect(contrast(resolve(fg), resolve(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
