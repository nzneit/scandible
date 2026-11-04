# Contributing to scandible

## Setup

Requires Node 24 (the version in `.nvmrc`).

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm test         # svelte-check + Vitest suite (jsdom)
npm run lint     # Prettier check + ESLint
npm run build    # production build to dist/
npm run preview  # serve the production build locally
npm run gs1-ais  # regenerate src/lib/gs1-ais.json from the pinned GS1 Syntax Dictionary
```

## Stack

- **SvelteKit** and **Svelte 5** (static-adapter SPA, TypeScript)
- **JsBarcode** for the 21 linear formats (inline SVG)
- **bwip-js** 4.11.4 for the 2D and GS1 formats (inline SVG)
- **Vitest** and **@testing-library/svelte** (jsdom) for the unit tests

## Writing tests

The route and component tests follow Testing Library's guiding principle: "The more your tests
resemble the way your software is used, the more confidence they can give you."
([guiding principles](https://testing-library.com/docs/guiding-principles),
[query priority](https://testing-library.com/docs/queries/about))

- **Find elements the way a user does**, in this order: `getByRole` with a name, `getByLabelText`,
  `getByPlaceholderText`, `getByText`, `getByDisplayValue`, then `getByAltText` and `getByTitle`.
  Do not add test IDs. A file input and a `<summary>` have no role, so find them by their label.
- **Use exact names and text**, and the exported constants where they exist (`GS1_HINT`,
  `LAX_NOTE`, `SCAN_HINT`, `DENSE_HINT`). When a query matches more than one element, narrow it with
  `within()`, or give the element an accessible name.
- **Query through `screen`.** A test that renders more than once scopes its queries to the render it
  means, usually the latest, with `within(<that render>.container)`. A test that unmounts the earlier
  render first may use `screen`.
- **Assert what a user can observe**, with the jest-dom matchers: `toBeDisabled`, `toBeChecked`,
  `toHaveFocus`, `toBeVisible`, `toHaveAccessibleDescription`, `toAppearBefore` and the rest.
  - Exact text stays exact: compare `textContent` with `toBe`, which keeps a verdict's leading
    space. `toHaveTextContent` matches a substring, with whitespace collapsed.
  - Number fields use `toHaveDisplayValue('1.00')`, because `toHaveValue` reads `1.00` as `1`.
  - A verdict's meaning is its text, never its color class.
- **Pair every absence check with a presence check.** A `queryBy…` that expects `null`, or
  `not.toBeInTheDocument()`, needs the same query arguments in a `getBy…` in the same file, so a
  mistyped name cannot pass forever.
- **Two fallbacks may still use a selector**, each marked with its reason on the line above:
  - stage structure, which covers the engine's barcode items, since they have no role:
    `// eslint-disable-next-line testing-library/no-node-access -- stage structure: <reason>`;
  - state that exists only visually, such as the play overlay's faded `hidden` class:
    `// fallback -- visual state: <reason>`.

  Anything else that seems to need a selector is a missing accessible name: fix it with an
  attribute.

- **Lint enforces these rules** for `src/routes/**/*.test.ts` and
  `src/lib/components/**/*.test.ts` (eslint-plugin-testing-library), and reports a stale disable
  comment as an error.
- **The stage tests are exempt.** `ScrollColumn`, `StepStage` and the engine tests check the classes
  the engine renders, which are the contract between the engine and the stage CSS.
- **Events use `fireEvent`** until a later spec decides on `@testing-library/user-event`.

## Deployment

Every push to `main` runs the lint, tests and build in GitHub Actions
(`.github/workflows/deploy.yml`) and publishes `dist/` to GitHub Pages with
`actions/deploy-pages`. Production builds set SvelteKit's `paths.base` to `'/scandible'` for the
project-site subpath, adapter-static emits the site to `dist/`, and the repository's Pages source
is set to **GitHub Actions**.

## Documentation

- [README.md](README.md) is the front page for QA readers: what scandible does, what it can test, a
  quick start and the format list. Keep it short.
- [docs/guide.md](docs/guide.md) holds the full reference. Put new behavior, limits and settings
  there, and link to it from the README's "What you can test" table when a feature opens a new kind
  of test.
