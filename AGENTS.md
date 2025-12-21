# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the application source (React + TypeScript). Key areas include `components/`, `pages/`, `context/`, `hooks/`, `lib/`, and shared `types/`.
- `src/assets/` stores bundled images and media used by the app.
- `public/` contains static assets served as-is.
- `dist/` is the production build output (generated).
- Config files live at the repo root (e.g., `vite.config.ts`, `tailwind.config.js`, `eslint.config.js`).

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server for local development.
- `npm run build` runs TypeScript build (`tsc -b`) and creates a production bundle via Vite.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint across the repo.

## Coding Style & Naming Conventions
- TypeScript + React function components are standard in `src/`.
- Indentation is 2 spaces; semicolons are used. Match existing string quote style within a file.
- Use the `@` path alias for imports from `src` (e.g., `@/components/Button`).
- Linting is defined in `eslint.config.js` with React Hooks and React Refresh rules.

## Testing Guidelines
- No automated test framework is currently configured.
- Use `npm run lint` and `npm run build` as the baseline CI checks.
- If adding tests, prefer colocating them with source files (e.g., `Component.test.tsx`) and document the new test runner in this file.

## Commit & Pull Request Guidelines
- Commit history follows Conventional Commits (e.g., `feat:`, `fix:`, `style:`) with concise, sentence-style summaries.
- PRs should include: a short summary, testing notes (`npm run lint`, `npm run build`), and screenshots for UI changes.

## Security & Configuration Tips
- Firebase config is expected in `.env.local` (see `.env.example`). Do not commit secrets.
- PWA settings are defined in `vite.config.ts`; keep icons and manifest metadata in sync when updating branding.
