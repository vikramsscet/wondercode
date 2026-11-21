# ADR 0011: Design system

Status: Accepted

## Decision
- Tailwind v4 `@theme` tokens and a small set of in-house components; no third-party UI library.
- Fonts are self-hosted (`@fontsource-variable/nunito`, `@fontsource-variable/noto-sans-devanagari`) so a child-facing app makes no third-party requests and Hindi renders consistently.
- Colour contrast is enforced by a unit test that reads the real tokens.
- A development-only `/design` page documents the system.

## Consequences
Two small font dependencies and a larger bundle of font files (only used subsets are downloaded by the browser). Adding a component or colour pair means updating the docs page and the contrast test.
