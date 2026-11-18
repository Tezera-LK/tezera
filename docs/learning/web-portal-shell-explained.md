# What a web portal shell is: the theory

> **Companion to [web-portal-shell.md](web-portal-shell.md)**, the decision record for Jira EN-06. That document records *what we chose and why*. This one explains *the ideas behind it*, for anyone new to portal shells or the Next.js App Router.
>
> **Written:** 2026-11-04 · **Code it describes:** branch `feature/webportalshell`, Phase A

---

## 1. Summary

A **web portal shell** is the frame that every signed-in page sits inside, plus the rules about who may enter which part of it. It contains no features of its own. Feature tickets build pages, and those pages slot into the shell.

The shell has five jobs:

1. **Draw the frame:** the top bar, the sidebar and the space where the page goes.
2. **Adapt to the role:** organisers, vendors, freelancers, consumers and admins get different colours and links.
3. **Guard the doors:** check that you are signed in, and that you have the right role for each area.
4. **Give every page the same building blocks:** standard loading, error and "nothing here yet" screens, and one typed way to read data.
5. **Provide the public pages:** event and profile pages that anyone can open without logging in.

---

## 2. An analogy: a shopping mall before the shops open

| In a mall | In the portal | In our code |
| --- | --- | --- |
| The building, corridors and signs | Top bar, sidebar, page area | [PortalShell.tsx](../../apps/web/src/components/portal/PortalShell.tsx) |
| Different signage for staff and for shoppers | A different sidebar for each role | [nav.ts](../../apps/web/src/components/portal/nav.ts) |
| Security at the main entrance | "Are you signed in?" | `requireSession()` in [session.ts](../../apps/web/src/lib/auth/session.ts) |
| Staff-only doors | "Do you have the right role?" | `requireRole()` in the same file |
| "Opening soon" and "Temporarily closed" signs | Loading, error and empty states | [components/states/](../../apps/web/src/components/states/) |
| Shop windows facing the street | Public pages anyone can view | [app/(public)/](../../apps/web/src/app/(public)/) |
| The shops themselves | The real features (My events, Booking requests…) | **Other tickets** |

EN-06 builds everything in this table except the shops. That is why PG-05, US-C15, PG-18 and US-A01 all depend on it.

---

## 3. Why build the frame first?

- **Build once, reuse everywhere.** Without a shell, every feature page would redraw its own sidebar and redo its own login check, in five slightly different ways.
- **Consistency.** Every page has the same layout and the same "Loading…" look, so users only have to learn the portal once.
- **Security in one place.** Only one function decides who is signed in. Fixing or changing it there fixes it everywhere.
- **Teammates can work in parallel.** Once the frame and the doors exist, several people can build pages at the same time without changing each other's files.
- **Separation of concerns.** This is the software-design idea of keeping different responsibilities in different places. The shell handles *where things go and who may see them*. Pages handle *what they show*.

---

## 4. Next.js ideas you need first

### Folders become URLs
In the **App Router** (Next.js's folder-based routing), each folder inside `src/app` is a piece of the URL, and a `page.tsx` file inside a folder is the page shown at that address.

```
src/app/dashboard/page.tsx   →  /dashboard
src/app/organiser/page.tsx   →  /organiser
```

### Layouts wrap pages and stay on screen
A `layout.tsx` wraps **every page in its folder and in the folders below it**. When you move between those pages, the layout **stays mounted**: it isn't rebuilt, only the page inside it changes. That's how the sidebar stays in place while you click around.

### Route groups: `(name)`
A folder name in round brackets is a **route group**. It groups pages so they can share a layout, but **it doesn't appear in the URL**.

```
src/app/(portal)/organiser/page.tsx   →  /organiser        (not /portal/organiser)
src/app/(public)/events/[id]/page.tsx →  /events/123
```

We use two groups:
- `(portal)`: signed-in pages, wrapped in the portal shell;
- `(public)`: pages for anyone, wrapped in a lighter public layout.

`[eventId]` in square brackets is a **dynamic segment**: one file serves `/events/1`, `/events/2` and so on, and the page receives the ID.

### Server Components and Client Components
- **Server Component** (the default): runs on the server, can read data directly and sends finished HTML to the browser. Most of the shell is built from these.
- **Client Component** (a file that starts with `'use client'`): also runs in the browser. You need one for anything interactive, such as clicks, typing or state that changes on screen. For example, [error.tsx](../../apps/web/src/app/(portal)/error.tsx) is one, because its "Try again" button needs a click handler.

### Special files
Next.js gives certain file names a special job:

| File | What it does |
| --- | --- |
| `page.tsx` | The page at this URL |
| `layout.tsx` | The frame around every page in this folder and below |
| `loading.tsx` | Shown while the page is still being prepared |
| `error.tsx` | Shown if the page throws an error; the layout around it stays visible |
| `not-found.tsx` | Shown when a page calls `notFound()`, e.g. for an event ID that doesn't exist |

---

## 5. The five jobs in detail

### Job 1: Draw the frame

```
┌──────────────────────────────────────────────────┐
│ Top bar: logo · search · messages · 🔔 · profile │
├────────────┬─────────────────────────────────────┤
│  Sidebar   │                                     │
│  General   │      The page goes here             │
│  - Home    │      (whatever the URL is)          │
│  - Feed    │                                     │
│  Tools     │                                     │
│  - ...     │                                     │
└────────────┴─────────────────────────────────────┘
```

[(portal)/layout.tsx](../../apps/web/src/app/(portal)/layout.tsx) wraps every signed-in page in `PortalShell`. A page only provides the middle part.

The shell **only draws**. It doesn't decide who is allowed in; that's Job 3. Keeping drawing and security apart means a change to the design can never open a security hole by accident.

The layout also marks portal pages `noindex`, so search engines leave private pages out of their results. The public pages in Job 5 are the opposite: they are meant to be found.

### Job 2: Adapt to the role

Each account has **exactly one role**. The role comes from the user's Cognito group, a label on their account in AWS's sign-in service (`attendee`, `organiser`, `vendor`, `freelancer` or `admin`). The shell reads the role and changes two things:

| Role | Colour palette | Tools folder | Tools in the sidebar |
| --- | --- | --- | --- |
| Organiser | organiser | `/organiser` | My events, Hiring, Feed and promotion, Payments |
| Vendor | vendor | `/vendor` | Booking requests, Job posts, Stalls, My bookings, My stall listing, Payments, Verification |
| Freelancer | vendor | `/freelancer` (its own since 18 Nov) | Same as vendors, minus Stalls and My stall listing |
| Attendee | attendee | none | Shared pages only |
| Admin | organiser (proposed) | `/admin` | Verification requests, Reports, Moderation, Users |

Each tools folder has the same word as that role's log-in screen (`/vendor` and `/vendor/login`), so the address says whose area it is.

Every role also gets the **shared** pages: Home, Feed and events, Messages, Community, Leaderboards, Reviews, Profile and Settings. They exist **once** and are not copied per role.

A sidebar item for a page that no ticket has built yet shows as a "coming soon" pill, not as a link.

The mapping lives in [portal-roles.ts](../../apps/web/src/lib/portal-roles.ts) (role → colours) and [nav.ts](../../apps/web/src/components/portal/nav.ts) (role → links). Every URL is built through [routes.ts](../../apps/web/src/lib/routes.ts), so renaming a URL means changing one file.

### Job 3: Guard the doors

There are two checks, both run **on the server**:

1. **Are you signed in?** [src/proxy.ts](../../apps/web/src/proxy.ts) runs before every page except the public ones. If you aren't signed in, it sends you to a log-in screen: the one for the role in the address (`/vendor` → `/vendor/login`), otherwise the default one. [(portal)/layout.tsx](../../apps/web/src/app/(portal)/layout.tsx) checks again with `requireSession()`.
2. **Do you have the right role?** Each tools folder has a **gate**: a `layout.tsx` that calls `requireRole(...)`.
   - [organiser/layout.tsx](../../apps/web/src/app/(portal)/organiser/layout.tsx): `requireRole("organiser")`
   - [vendor/layout.tsx](../../apps/web/src/app/(portal)/vendor/layout.tsx): `requireRole("vendor")`
   - [freelancer/layout.tsx](../../apps/web/src/app/(portal)/freelancer/layout.tsx): `requireRole("freelancer")`
   - [admin/layout.tsx](../../apps/web/src/app/(portal)/admin/layout.tsx): `requireRole("admin")`

   If your role is wrong, you are sent back to `/dashboard`.

**How the server knows who you are.** When you log in, Amplify keeps your login **tokens** (signed pieces of text from Cognito) in **cookies**, because the browser sends cookies to the server with every request. That's what `ssr: true` in [ConfigureAmplify.tsx](../../apps/web/src/components/ConfigureAmplify.tsx) switches on. The server checks each token's signature with Cognito's public key, so editing a cookie to say "admin" doesn't work: the signature no longer matches. Tokens expire after an hour; `proxy.ts` then swaps the refresh token for new ones and saves them as cookies.

> **Key idea 1: hiding a link is not security.**
> Removing "Admin tools" from a vendor's sidebar only stops them *seeing* the link. Anyone can still type `/admin` into the address bar. The real protection is the server-side check, which runs no matter how someone arrives.

> **Key idea 2: check in the layout *and* in every page.**
> Layouts stay mounted, so a layout's code **does not re-run** when you move between the pages beneath it. That makes a layout check alone unreliable. Every page inside a tools folder calls `requireRole()` again, for example [organiser/page.tsx](../../apps/web/src/app/(portal)/organiser/page.tsx).

> **Key idea 3: defence in depth.**
> This means using several layers of protection, each catching what the previous one misses:
> 1. **Signed in?** `proxy.ts`, which runs before every request, and `requireSession()` in the portal layout.
> 2. **Right role?** `requireRole()` in the gates and pages.
> 3. **The real lock:** authorisation rules on the backend data (Amplify Data, Phase B). Even if someone skips the website and calls the API directly, the data layer refuses.
>
> Layers 1 and 2 give users a friendly redirect instead of a broken page. Layer 3 is what actually protects the data.

A signed-in account **without a role yet** can still open the shared pages, shown in the organiser colours, but it is turned away at every tools gate.

### Job 4: Standard states and a typed data client (T2)

**States.** Every page has the same three situations, so we built three components once ([components/states/](../../apps/web/src/components/states/)):

| Component | When it shows | Used by |
| --- | --- | --- |
| `LoadingState` | The page is still loading | each folder's `loading.tsx` |
| `ErrorState` | Something broke; offers "Try again" | `error.tsx` |
| `EmptyState` | Nothing to show yet, or nothing at this address | pages, `not-found.tsx` |

Their text is passed in as **props** (values a component receives from whoever uses it), so the text can move into translation files later (EN-07-T4).

> **Gotcha:** `loading.tsx` wraps its folder's *page*, not its *layout*. That's why each tools folder has its own `loading.tsx` instead of one at the `(portal)` level: the role check in the layout finishes first, and a wrong role gets a proper redirect, not a loading screen that turns into one.

**Typed data.** A TypeScript **type** describes the shape of some data. For example, a `PublicEvent` has a `title`, a `startsAt` date and a `district`. If a page misspells `event.titel`, the editor flags it before you run anything. A type can also act as a limit: `PublicEvent` has no venue or summary, so a public page *can't* show them (Job 5).

- Today: the types are written by hand in [lib/data/types.ts](../../apps/web/src/lib/data/types.ts), and the functions in [lib/data/public.ts](../../apps/web/src/lib/data/public.ts) return them.
- Later: once the backend has a data schema (EN-03), the types come from it. With Amplify Data that's `generateClient<Schema>()`; with the NestJS API it would be shared types. Which one is still the team's call. When the backend changes, TypeScript points to every frontend line that needs updating.

### Job 5: Public pages (T3)

Some pages must open **without logging in**: an event, an organiser's profile, a vendor's or freelancer's profile. People share these links on WhatsApp and Instagram, and Google should be able to index them.

They show a **teaser** (decided 18 Nov): just enough to recognise the event or the profile, then a box saying "See more on Tezera" with Log in and Create an account. Everything else needs an account.

| Page | URL | The teaser shows |
| --- | --- | --- |
| Event | `/events/<id>` | title, date and time, district, organiser's name, Postponed or Cancelled |
| Organiser profile | `/organisers/<id>` | name, district, Verified |
| Vendor profile | `/vendors/<id>` | name, what they do, Verified |
| Freelancer profile | `/freelancers/<id>` | name, what they do, Verified |

**Why a teaser and not the whole page.** A WhatsApp link preview is fetched by WhatsApp's server, which has no account. So whatever the preview shows is public by definition. The teaser keeps previews working while keeping the public part small: a few fields per page, all meant for strangers. See [public pages and the portal](web-portal-shell-public-vs-portal.md).

**Rendered on the server.** The server sends finished HTML, not an empty page that fills itself in later. Search engines and link previews can read it straight away. `generateMetadata()` supplies the title, the description and the Open Graph tags that WhatsApp reads, all built from the teaser's own fields.

**Cached.** Every visitor sees the same page, so it is built once and reused:

```ts
export const dynamic = "force-static"; // build once, serve the same copy to everyone
export const revalidate = 60;          // rebuild in the background at most once a minute
```

This is called **ISR** (incremental static regeneration). It is fast and cheap, because most visits don't touch the backend at all.

> **Gotcha:** both lines are needed. `revalidate` on its own quietly falls back to rendering on every request.

> **Key idea 4: a cached page must not depend on who is looking.**
> If a public page said "Hi, Navindu", that copy would be cached and shown to *everyone*. So the server sends every visitor the same page, and the browser adjusts it afterwards: if it finds a login cookie, the header button says "Your dashboard" instead of "Log in", and the teaser's box points to the dashboard. That check is only a hint for a button's words, never a decision about what someone may see.

**Guest access and privacy.** Public pages read data as a **guest**: someone with no account. Backend rules then limit what a guest can see:
- draft events are never public;
- descriptions, venues, contact details and lists stay behind sign-in (the teaser);
- attendee profiles are not public at all. This matters under Sri Lanka's PDPA (Personal Data Protection Act).

[lib/data/public.ts](../../apps/web/src/lib/data/public.ts) already drops drafts and picks out only the teaser fields, and the backend must enforce the same rules. That's defence in depth again.

---

## 6. Walkthrough: what happens when someone opens `/organiser`

```
Browser asks for /organiser (with its login cookies, if any)
        │
        ▼
src/proxy.ts ── valid tokens? (refreshes them if they've expired) ── no ──► redirect to /organiser/login
        │ yes
        ▼
(portal)/layout.tsx ── requireSession() reads the role from the token's group
        │
        ▼
PortalShell draws the top bar + sidebar in the role's colours
        │
        ▼
organiser/layout.tsx ── requireRole("organiser") ── wrong role? ──► redirect to /dashboard
        │ organiser
        ▼
organiser/page.tsx ── requireRole("organiser") again ── renders inside <main>
```

Three people try it:

| Who | What happens |
| --- | --- |
| A visitor who isn't signed in | Stopped by `proxy.ts` and sent to `/organiser/login` |
| A signed-in vendor | Passes the first check, stopped at the organiser gate and sent to `/dashboard` |
| A signed-in organiser | Passes both checks and sees the organiser tools page inside the shell |

---

## 7. What the shell does *not* do

- **It doesn't build the features.** "My events", "Booking requests" and the rest belong to their own tickets. The shell only reserves their place in the sidebar.
- **It doesn't log anyone in.** The sign-up and log-in screens and putting users into role groups are EN-04 (Danella, Cognito). The shell reads who is signed in on the server (`getSession()`, `proxy.ts`; EN-04-T4, built in this branch) and sends people to her screens.
- **It doesn't define the data.** The database schema is EN-03. The shell only reads through it.
- **It doesn't set the visual design system.** That's EN-07 (Reshan). The shell follows the team's wireframes and uses the existing colour tokens.

---

## 8. Building before the backend exists: stand-ins

EN-06 depends on EN-03 (data) and EN-04 (auth). Pages talk to the backend through a few small functions, never directly:

| Function | 3 Nov (Phase A) | Since 18 Nov |
| --- | --- | --- |
| `getSession()` | In `next dev`: the role picked in the **"View as"** box. In production: always "nobody". | **Real:** reads the Cognito tokens from the cookies. Only in `next dev` without a user pool (CI's placeholder `amplify_outputs.json`), where nobody can sign in, does the "View as" box still pick the role. |
| `getPublicEvent()` and the others | In `next dev`: sample records from `samples.ts`. In production: nothing. | The same, still waiting for data (EN-03). They now return teasers. |

These functions are a **seam**: a fixed point where one implementation can be swapped for another without touching the code that uses it. On 18 Nov only the inside of `getSession()` changed; the pages and gates that call it stayed the same. That's the seam doing its job. `samples.ts` goes once real data exists, and the "View as" files once every developer has a sandbox.

---

## 9. Where EN-06 stands (18 Nov 2026)

- **Phase A, everything that needs no backend:** built 3 Nov; redrawn after the team's wireframes on 4 Nov (Decision 7).
- **Real sign-in on the server (EN-04-T4):** built 18 Nov. `proxy.ts` and `getSession()` read Danella's Cognito login from cookies; log in, setup and verification now end on `/dashboard`; the avatar menu has Log out.
- **Teasers and the freelancer area:** built 18 Nov (Decisions 4 and 1, changed).
- **Still waiting:** real data (EN-03 and the NestJS-or-Amplify choice), and a test with a real user pool (`pnpm sandbox`).
- On `feature/webportalshell`, ahead of `dev`. Merging into `dev` publishes it to dev.tezera.lk, so that waits for a pull request and a review.

For the full reasoning, see the decision record: [Decision 1 (layouts)](web-portal-shell.md#decision-1-role-based-layouts), [1c (defence in depth)](web-portal-shell.md#1c-where-the-role-is-checked-defence-in-depth), [Decision 2 (typed data)](web-portal-shell.md#decision-2-typed-amplify-data-client), [Decision 3 (states)](web-portal-shell.md#decision-3-loading-error-and-empty-states), [Decision 4 (public pages)](web-portal-shell.md#decision-4-public-server-rendered-event-and-profile-pages-guest-access), [Decision 6 (stand-ins)](web-portal-shell.md#decision-6-building-before-the-backend-exists), [Decision 7 (wireframes)](web-portal-shell.md#decision-7-following-the-wireframes) and the [glossary](web-portal-shell.md#words-you-will-see-glossary).

---

## 10. Check yourself

<details>
<summary>1. What URL serves <code>app/(portal)/vendor/page.tsx</code>?</summary>

`/vendor`. The route group `(portal)` doesn't appear in the URL.
</details>

<details>
<summary>2. A vendor types <code>/organiser</code> into the address bar. What happens, and which file causes it?</summary>

They are sent to `/dashboard`. `organiser/layout.tsx` (and the page itself) calls `requireRole("organiser")`, and a vendor fails that check.
</details>

<details>
<summary>3. Why doesn't removing a link from the sidebar stop someone opening that page?</summary>

The sidebar only controls what people *see*. Anyone can type a URL. Only the server-side checks (`requireSession()`, `requireRole()` and, in Phase B, the backend's authorisation rules) actually stop them.
</details>

<details>
<summary>4. The organiser layout already calls <code>requireRole()</code>. Why does the page call it again?</summary>

Layouts stay mounted and don't re-run when you move between the pages beneath them, so a layout check alone isn't a reliable security boundary.
</details>

<details>
<summary>5. Why can't a public event page show "Hi, Navindu" from the server?</summary>

The page is cached and served to every visitor (`force-static` + `revalidate = 60`). A personal greeting would be cached and shown to everyone. Personal parts have to be added in the browser by a Client Component.
</details>

<details>
<summary>6. On a production build, you open <code>/dashboard</code> without logging in. What happens, and why can't the "View as" box help?</summary>

`proxy.ts` finds no valid login cookies and sends you to `/login` (which goes on to `/attendee/login`). The "View as" box only exists in `next dev` without a user pool; a production build always uses the real Cognito session, so a deployed site can never run with a fake sign-in.
</details>

<details>
<summary>7. An organiser edits their token cookie so that its group says "admin". Do they get into <code>/admin</code>?</summary>

No. The token is signed by Cognito, and the server checks that signature with Cognito's public key before believing anything inside it. An edited token fails the check, so the server treats them as signed out and sends them to log in.
</details>

<details>
<summary>8. Which ticket builds the "My events" page?</summary>

Not EN-06. The shell only shows its "coming soon" place in the organiser sidebar. A feature ticket builds the page and drops it into the shell.
</details>
