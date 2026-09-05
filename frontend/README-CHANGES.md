# Reliable Fresh — UI pass (Level 2)

Every file here goes back at the **same path it came from**. Nothing was
renamed or moved. No props, exports, function signatures, API calls,
routes, hooks or types were changed. The 233 files under `src/features/`
are untouched except for the login page — they inherit everything through
the design tokens.

## Replace these files

| Path | What changed |
|---|---|
| `index.html` | Font preload, theme colour, meta description |
| `vite.config.ts` | PWA precache globs now include `woff2`/`webp`; manifest colours |
| `src/styles/tokens.css` | Full palette rewrite, self-hosted font, status scale |
| `src/components/layout/AppShell.tsx` | Sidebar collapse state + persistence + reopen button |
| `src/components/layout/Sidebar.tsx` | Collapse control, collapsible nav groups, active marker |
| `src/components/layout/Header.tsx` | Quieter logout, larger touch targets, mobile spacing |
| `src/components/layout/PageHeader.tsx` | Horizon rule, wrapping actions |
| `src/components/layout/SectionCard.tsx` | Header divider, consistent radius |
| `src/components/layout/MobileDrawer.tsx` | Scroll lock, 44px targets, wider max |
| `src/components/data/DataTable.tsx` | Sticky header, zebra rows, no-wrap headers |
| `src/components/data/EmptyState.tsx` | Dashed frame, contrast fix on description |
| `src/components/workflow/StatusBadge.tsx` | Own colour scale + status dot |
| `src/components/forms/inputStyles.ts` | Focus ring, placeholder colour, error token |
| `src/features/auth/pages/LoginPage.tsx` | Mobile stacking fix, scrim, WebP background |

## Add these files

- `public/fonts/inter-latin-variable.woff2`  (48 KB — create the `fonts/` folder)
- `public/farm-crate.webp`  (88 KB)

## Delete this file

- `public/farm-crate.png`  (1,775 KB — nothing references it after this change)

## Verified here before handing over

- `vite build` — passes
- `tsc -b --noEmit` — no errors in application code
- `oxlint` on every changed file — 0 warnings, 0 errors
- Font and WebP confirmed present in the generated service-worker precache

## Not verified

I cannot run a browser, so nothing here has been looked at. Expect to
adjust spacing and a few tints once you see it.

## Known pre-existing issues I did NOT touch

- Active Farms shows `Invalid Date` in the Last updated column — a date
  parsing/formatting bug in feature code, not styling.
- `CameraCapture.tsx` has a `set-state-in-effect` lint warning.
- Test files fail to typecheck against the installed
  `@testing-library/react`; unrelated to this pass.
