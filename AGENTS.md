# Repository Guidelines

## Project Structure & Module Organization
The application boots from `src/main.ts`, mounting Svelte components declared in `App.svelte`. Keep reusable widgets under `src/lib`, grouping helpers alongside their components. Static images and fonts belong in `src/assets`; files placed in `public/` are served verbatim at the site root. Add future integration or end-to-end tests under `tests/` (create the folder if absent) so tooling can discover them predictably.

## Build, Test, and Development Commands
Run `npm install` after pulling new dependencies. `npm run dev` starts the Vite dev server with hot module replacement on http://localhost:5173. `npm run build` emits an optimized production bundle to `dist/`. `npm run preview` serves the latest build for pre-deploy smoke checks. `npm run check` executes `svelte-check` against `tsconfig.app.json`, then runs `tsc` with `tsconfig.node.json` to verify TypeScript types.

## Coding Style & Naming Conventions
Use TypeScript across `.ts` files and `<script lang="ts">` blocks. Follow 2-space indentation, single quotes in scripts, and trailing commas in multiline literals to match Prettier defaults. Name Svelte components in PascalCase (`Counter.svelte`), utility modules in camelCase (`formatDate.ts`), and CSS classes in kebab-case. Keep component sections ordered as script, markup, then style, and prefer scoped styles within each `.svelte` file.

## Testing Guidelines
Source-controlled tests should mirror the feature under test (e.g., `src/lib/counter/__tests__/Counter.spec.ts`). Use descriptive names such as `renders increment button` for individual test cases. Always run `npm run check` before pushing; add a dedicated `npm run test` script once Vitest or another framework is configured. Document any manual QA steps in PR notes when automated coverage is unavailable.

## Commit & Pull Request Guidelines
Adopt Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) so history stays searchable. Keep commits scoped to a single concern and ensure code compiles before committing. Pull requests should summarize the change, link related issues, and attach screenshots or GIFs for UI updates. List verification steps (commands run, browsers checked) in the PR description. Request a review from another contributor whenever workflows or shared components change.

## Security & Configuration Tips
Store secrets outside the repo; prefer environment variables loaded via `.env` files ignored by Git. Review Vite and Svelte dependency updates promptly to receive security patches. Validate third-party scripts before importing them into `public/` or `src/assets`, and document any required CSP or CORS adjustments in the README.
