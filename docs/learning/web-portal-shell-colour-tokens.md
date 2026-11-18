# Colour tokens: why the portal lost its colours on 4 Nov, and the fix

> **Companion to** [web-portal-shell.md](web-portal-shell.md) (the decision record).
>
> **Written:** 2026-11-04 · **Fix status:** done on `feature/webportalshell`, not committed yet. Danella's `feature/auth` will hit the same problem when it merges `main` (section 7).

---

## 1. What happened

| Time (4 Nov) | What |
| --- | --- |
| 07:20 | Screenshots of the shell: every role in its own colours. |
| 16:05 | `git pull origin main` brought PR #14 (Yevan's landing-page update) into `feature/webportalshell`. |
| 16:44 | Screenshots of the shell: no colours at all. The sidebar card was transparent, buttons had no fill, the dashed "coming soon" pills were gone, and the public pages lost their borders. |
| Evening | Cause found and fixed in the shell's own files (this document). |

PR #14 rewrote `apps/web/src/app/globals.css`, removing about 500 lines. Among other things, it removed:

- the 15 **role colours**: `--att-*` (consumers), `--org-*` (organisers) and `--ven-*` (vendors and freelancers);
- two **page colours**: `--page-muted` and `--page-line` (and `--btn-ink`, which the shell didn't use);
- **dark mode**, both the automatic one (following the computer's setting) and the forced one;
- the **`body { margin: 0 }` reset** for every page. It now only applies on the landing page.

It also deleted the empty `(auth)/layout.tsx` and `(auth)/login/page.tsx`, so `/login` shows "Page not found" until Danella's branch merges.

---

## 2. Why nothing warned us: how CSS variables fail

A CSS variable (a **custom property**) is defined once and read with `var()`:

```css
:root    { --org-p: #526c80; }       /* globals.css defined it       */
.root    { --p: var(--org-p); }      /* Palette.module.css mapped it */
.sidebar { background: var(--p); }   /* the shell used it            */
```

When `--org-p` disappeared, `--p` became **invalid**. Every rule that read `var(--p)` then quietly fell back to the property's default: `background` became transparent, and a `border` shorthand meant no border at all.

**There was no error anywhere.** The build, TypeScript and ESLint all pass, because nothing checks CSS variables. Only looking at the page shows the problem. Two lessons:

1. **After every `git pull`, open the app and look.** A passing build isn't enough.
2. **A fallback value protects you.** `var(--p, #526c80)` uses `#526c80` when `--p` is missing. The empty-state boxes already did this (`States.module.css`), which is why they still looked fine.

---

## 3. The fix (Option A)

Only EN-06's own files changed:

| File | Change |
| --- | --- |
| `src/components/Palette.module.css` | The 15 role colours are now defined here, on `.root`, the class every portal page and public card already carries. The values are copied from `globals.css` before PR #14 (commit `077b258`). Dark-mode rules removed. |
| `src/components/public/Public.module.css` | `--page-muted` and `--page-line` defined on the public pages' wrapper (and `--page-muted` on the stand-alone "Page not found" page). Margin reset (section 4). A soft shadow on event and profile cards, because the consumer card is the same colour as the page. |
| `src/components/portal/PortalShell.module.css` | Dark-mode rules removed. Margin reset. Styles for the floating "View as" box. |
| `src/components/portal/PortalShell.tsx` | "View as" moved out of the sidebar. It now floats in the bottom-right corner, so it's always in reach during a demo instead of being cut off at the bottom of a long sidebar. |

**Why not put the colours back into `globals.css` (Option B)?** That file is Yevan's, every page loads it, and `origin/dev` changes it again. Editing it means merge conflicts and needs the team's agreement. Option A touches nothing anyone else owns, so it can't break their pages.

The proper long-term home is one shared tokens file from the design system (EN-07). When it exists, delete the copies in `Palette.module.css` and `Public.module.css`.

---

## 4. The margin fix, explained

Browsers give `<body>` an 8px margin by default. `globals.css` used to remove it on every page; now it only does so on the landing page. The result was an 8px beige frame around the portal and 16px of pointless scrolling.

The fix, in `PortalShell.module.css` (and the same idea in `Public.module.css`):

```css
:global(body):has(> .shell) {
  margin: 0;
}
```

- `:global(body)` means the real `<body>` element. CSS Modules rename everything in the file unless it's wrapped in `:global()`.
- `:has(> .shell)` limits it to while the portal's wrapper sits directly inside `<body>`.
- So the rule only applies on our pages, and the landing page is untouched.

Both bundlers accept it:
- Turbopack, used by `next dev`;
- webpack's CSS Modules "pure" check, which requires every selector to include one of the file's own classes. `.shell` inside `:has()` counts.

Delete these rules once `globals.css` resets the margin on every page again.

`globals.css` now also has `body { display: flex; flex-direction: column; gap: 30vh }` for the landing page. It doesn't affect our pages today: checked, every page is exactly as tall as the window. `origin/dev` already removes it.

---

## 5. Dark mode: switched off for now

PR #14 removed dark mode from the whole site. If the portal kept its own, a laptop set to dark mode would show a dark portal next to a light landing page and light public pages, which looks broken. So the shell is light-only for now, like everything else.

To bring dark mode back (a decision for EN-07), these were the values before PR #14:

| Variable | Light | Dark |
| --- | --- | --- |
| `--att-t` / `--att-b` | `#392f3d` / `#f7f0ed` | `#ccc2d0` / `#120b08` |
| `--att-p` / `--att-s` / `--att-a` | `#d77e70` / `#f09eb4` / `#e5c76c` | `#8f3628` / `#610f25` / `#93751a` |
| `--org-t` / `--org-b` | `#282829` / `#ffffff` | `#d6d6d7` / `#1b2533` |
| `--org-p` / `--org-s` / `--org-a` | `#526c80` / `#70a98d` / `#6f908b` | `#7f9aad` / `#568f76` / `#6f908b` |
| `--ven-t` / `--ven-b` | `#050316` / `#e9e7e2` | `#dcdbe4` / `#1d1b16` |
| `--ven-p` / `--ven-s` / `--ven-a` | `#70a992` / `#658095` / `#b6c3a7` | `#5a9179` / `#7d97ab` / `#4b583c` |
| `--page-bg` / `--page-ink` | `#d7dfea` / `#282829` (`#f7f0ed` / `#282829` since PR #14) | `#151d28` / `#d6d6d7` |
| `--page-muted` / `--page-line` | `#4c5866` / `#b9c4d2` | `#a7b0bc` / `#2c3a4b` |
| `--focus` | `#6f908b` | `#7f9aad` |

The shell also had these dark-only rules, removed on 4 Nov:

```css
/* Palette.module.css: text on the role colour */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .root[data-palette="att"] { --on-p: #fff; }          /* 7.7:1 */
  :root:not([data-theme="light"]) .root[data-palette="ven"] { --on-p: var(--ven-b); }  /* 4.7:1 */
}
:root[data-theme="dark"] .root[data-palette="att"] { --on-p: #fff; }
:root[data-theme="dark"] .root[data-palette="ven"] { --on-p: var(--ven-b); }

/* PortalShell.module.css: --p is a light tint in the dark theme, so the sidebar card becomes a
   dark mix of it and the current page's pill turns light on dark */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .shell {
    --side: color-mix(in srgb, var(--p) 30%, var(--b));
    --on-side: var(--t);
    --current: var(--t);
    --on-current: var(--b);
  }
}
:root[data-theme="dark"] .shell { /* the same four lines */ }
```

---

## 6. How it was checked (4 Nov, evening)

- **Screenshots** at 1440 × 900 of:
  - all five roles, plus "No role yet";
  - organiser tools, and a vendor opening `/admin` (sent back to the dashboard);
  - four public pages, the draft event and "Page not found";
  - a phone (390px wide) and a computer in dark mode.
- **Measured in the browser:**
  - sidebar colours: `#526c80` for organiser and admin, `#70a992` for vendor and freelancer, `#d77e70` for consumer;
  - every page is exactly as tall as the window, so there's no stray scrolling;
  - a dark-mode computer now gets the light portal.
- **ESLint** is clean.
- **TypeScript:** our source code is clean. 8 errors remain inside the generated `.next/types` folder. It's left over from the morning's build and points at the `(auth)` files PR #14 deleted. The next `next build` regenerates it.

---

## 7. What to tell the team

- **Yevan:** PR #14 removed the role colours, `--page-muted`, `--page-line`, dark mode and the margin reset that other pages relied on. Was that intended? Could the margin reset apply to every page again?
- **Reshan (EN-07):** the brand colours need one shared home that the landing page, the portal and the login pages all read. Today the landing CSS hard-codes them:
  - `#d77e70` and `#70a992`;
  - `#536f82`, which is nearly the organiser slate `#526c80`.

  Also: dark mode for the whole site, or none?
- **Danella (EN-04):** `AuthLayout.module.css` on `feature/auth` reads the role colours on 10 lines. Her branch still defines them in its own `globals.css`, because it started before PR #14, so the colours will disappear when she merges `main`. PR #14 also deleted the empty `(auth)` files that her branch fills in, so expect merge conflicts there.

---

## 8. Lessons

1. **A shared stylesheet is a contract between teammates.** Before deleting a variable, search the whole repo for `var(--its-name)`.
2. **CSS fails silently.** Look at the app after every pull, and give important `var()`s a fallback.
3. **Keep a feature's styles self-contained** (CSS Modules plus its own copy of the tokens) while the shared layer is still changing.
4. **Don't `git pull` just before a demo.**
