# Deployment Failure Analysis — Vercel CSS Import

**Date:** 2026-06-04  
**Repository:** https://github.com/shanu222/Influencer-universe.git  
**Platform:** Vercel  
**Status:** Resolved

---

## Reported Error

```
Can't resolve '../src/styles/theme.css'
```

Source: `app/globals.css` line 1:

```css
@import "../src/styles/theme.css";
```

---

## Reproduction (Local, Vercel-equivalent)

With the `src/` directory absent (matching the git clone on Vercel):

```bash
npm run build
```

**Result:** Identical failure:

```
Syntax error: tailwindcss: app/globals.css Can't resolve '../src/styles/theme.css' in 'app'
> 1 | @import "../src/styles/theme.css";
    | ^
```

With `src/` present locally (from the legacy Vite scaffold), the build previously succeeded.

---

## Root Cause

**Option confirmed: Missing file not committed + `.gitignore` exclusion**

| Factor | Finding |
|--------|---------|
| Missing file committed? | **No** — `src/styles/theme.css` was never in git |
| Incorrect import path? | **Yes** — pointed at legacy Vite directory |
| Case-sensitive mismatch? | **No** — filename casing was correct |
| `.gitignore` excluding styles? | **Yes** — entire `src/` directory excluded |
| Legacy Vite `src/` removed from repo? | **Yes** — intentionally excluded during production hardening |
| Build environment difference? | **Yes** — local disk had `src/`; Vercel clone did not |

### Timeline

1. App migrated from Vite (`src/`) to Next.js (`app/`).
2. Production hardening added `src/` to `.gitignore` as legacy scaffold.
3. `app/globals.css` was never updated — still imported `../src/styles/theme.css`.
4. Local developers retained `src/` on disk → builds passed locally.
5. Vercel clones only tracked files → `src/styles/theme.css` missing → build failed.

---

## Fix Applied

**Option B: Styles moved to committed Next.js location**

- Migrated `src/styles/theme.css` → `styles/theme.css` (tracked in git)
- Updated `app/globals.css` → `@import "../styles/theme.css";`
- Legacy `src/` remains gitignored (no dependency on excluded files)

---

## Verification

After fix, build succeeds with **no `src/` directory present** (Vercel-equivalent):

- `npm run type-check` — pass
- `npm run lint` — pass
- `npm run build` — pass

---

## Prevention

- Never import from gitignored paths in production entry files.
- Run `npm run build` in a clean clone (or without `src/`) before deploying.
- Keep design tokens in `styles/` (committed) rather than legacy `src/`.
