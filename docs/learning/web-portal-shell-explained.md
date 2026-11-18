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

Each account has **exactly one role**. In Phase B the role will come from a Cognito group, a label on the user's account in AWS's sign-in service. The shell reads the role and changes two things:

| Role | Colour palette | Tools folder | Tools in the sidebar |
| --- | --- | --- | --- |
| Organiser | organiser | `/organiser` | My events, Hiring, Feed and promotion, Payments |
| Vendor | vendor | `/vendor` | Booking requests, Job posts, Stalls, My bookings, My stall listing, Payments, Verification |
| Freelancer | vendor | `/vendor` (shared with vendors) | Same as vendors, minus Stalls and My stall listing |
| Consumer | attendee | none | Shared pages only |
| Admin | organiser (proposed) | `/admin` | Verification requests, Reports, Moderation, Users |

Every role also gets the **shared** pages: Home, Feed and events, Messages, Community, Leaderboards, Reviews, Profile and Settings. They exist **once** and are not copied per role.

A sidebar item for a page that no ticket has built yet shows as a "coming soon" pill, not as a link.

The mapping lives in [portal-roles.ts](../../apps/web/src/lib/portal-roles.ts) (role → colours) and [nav.ts](../../apps/web/src/components/portal/nav.ts) (role → links). Every URL is built through [routes.ts](../../apps/web/src/lib/routes.ts), so renaming a URL means changing one file.

### Job 3: Guard the doors

There are two checks, both run **on the server**:

1. **Are you signed in?** [(portal)/layout.tsx](../../apps/web/src/app/(portal)/layout.tsx) calls `requireSession()`. If you are not signed in, you are sent to `/login`.
2. **Do you have the right role?** Each tools folder has a **gate**: a `layout.tsx` that calls `requireRole(...)`.
   - [organiser/layout.tsx](../../apps/web/src/app/(portal)/organiser/layout.tsx): `requireRole("organiser")`
   - [vendor/layout.tsx](../../apps/web/src/app/(portal)/vendor/layout.tsx): `requireRole("vendor", "freelancer")`
   - [admin/layout.tsx](../../apps/web/src/app/(portal)/admin/layout.tsx): `requireRole("admin")`

   If your role is wrong, you are sent back to `/dashboard`.

> **Key idea 1: hiding a link is not security.**
> Removing "Admin tools" from a vendor's sidebar only stops them *seeing* the link. Anyone can still type `/admin` into the address bar. The real protection is the server-side check, which runs no matter how someone arrives.

> **Key idea 2: check in the layout *and* in every page.**
> Layouts stay mounted, so a layout's code **does not re-run** when you move between the pages beneath it. That makes a layout check alone unreliable. Every page inside a tools folder calls `requireRole()` again, for example [organiser/page.tsx](../../apps/web/src/app/(portal)/organiser/page.tsx).

> **Key idea 3: defence in depth.**
> This means using several layers of protection, each catching what the previous one misses:
> 1. **Signed in?** Today: `requireSession()` in the portal layout. EN-04 may add `proxy.ts`, which runs before every request.
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

**Typed data.** A TypeScript **type** describes the shape of some data. For example, a `PublicEvent` has a `title`, a `startsAt` date and a `venueName`. If a page misspells `event.titel`, the editor flags it before you run anything.

- Today: the types are written by hand in [lib/data/types.ts](../../apps/web/src/lib/data/types.ts).
- Phase B: Amplify Gen 2's `generateClient<Schema>()` takes the types straight from the backend schema (`amplify/data/resource.ts`). When the backend changes, TypeScript points to every frontend line that needs updating.

### Job 5: Public pages (T3)

Some pages must open **without logging in**: an event, an organiser's profile, a vendor's profile. People share these links on WhatsApp and Instagram, and Google should be able to index them.

| Page | URL | File |
| --- | --- | --- |
| Event | `/events/<id>` | [events/[eventId]/page.tsx](../../apps/web/src/app/(public)/events/[eventId]/page.tsx) |
| Organiser profile | `/organisers/<id>` | `(public)/organisers/[organiserId]/page.tsx` |
| Vendor or freelancer profile | `/vendors/<id>` | `(public)/vendors/[vendorId]/page.tsx` |

**Rendered on the server.** The server sends finished HTML, not an empty page that fills itself in later. Search engines and link previews can read it straight away. `generateMetadata()` supplies the title and description they show.

**Cached.** Every visitor sees the same page, so it is built once and reused:

```ts
export const dynamic = "force-static"; // build once, serve the same copy to everyone
export const revalidate = 60;          // rebuild in the background at most once a minute
```

This is called **ISR** (incremental static regeneration). It is fast and cheap, because most visits don't touch the backend at all.

> **Gotcha:** both lines are needed. `revalidate` on its own quietly falls back to rendering on every request.

> **Key idea 4: a cached page must not depend on who is looking.**
> If a public page said "Hi, Navindu", that copy would be cached and shown to *everyone*. That's why the public header has a plain "Log in" link. Anything personal must be added later in the browser, by a Client Component.

**Guest access and privacy.** In Phase B, public pages read data as a **guest**: someone with no account, given short-lived, read-only credentials. Backend rules then limit what a guest can see:
- draft events are never public;
- organiser contact details are hidden from visitors, while any signed-in role can see them;
- consumer profiles are not public at all. This matters under Sri Lanka's PDPA (Personal Data Protection Act).

[lib/data/public.ts](../../apps/web/src/lib/data/public.ts) already drops drafts, and the backend must enforce the same rule. That's defence in depth again.

---

## 6. Walkthrough: what happens when someone opens `/organiser`

```
Browser asks for /organiser
        │
        ▼
(portal)/layout.tsx ── requireSession() ── not signed in? ──► redirect to /login
        │ signed in
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
| A visitor who isn't signed in | Stopped at the first check and sent to `/login` |
| A signed-in vendor | Passes the first check, stopped at the organiser gate and sent to `/dashboard` |
| A signed-in organiser | Passes both checks and sees the organiser tools page inside the shell |

---

## 7. What the shell does *not* do

- **It doesn't build the features.** "My events", "Booking requests" and the rest belong to their own tickets. The shell only reserves their place in the sidebar.
- **It doesn't handle logging in.** Sign-up, login and putting users into role groups are EN-04 (Danella, Cognito). The shell only *asks* "who is this?" through `getSession()`.
- **It doesn't define the data.** The database schema is EN-03. The shell only reads through it.
- **It doesn't set the visual design system.** That's EN-07 (Reshan). The shell follows the team's wireframes and uses the existing colour tokens.

---

## 8. Building before the backend exists: stand-ins

EN-06 depends on EN-03 (data) and EN-04 (auth), and neither exists yet. To keep moving, pages talk to the backend through a few small functions, never directly:

| Function | Phase A (today) | Phase B (real) |
| --- | --- | --- |
| `getSession()` | In `next dev`: the role picked in the **"View as"** box in the bottom-right corner (a dev-only cookie). In production: always "nobody", so every portal page sends you to login. | Reads the real Cognito session |
| `getPublicEvent()` and the others | In `next dev`: sample records from `samples.ts`. In production: nothing, so a deployed site never shows made-up events. | Reads from Amplify Data as a guest |

These functions are a **seam**: a fixed point where one implementation can be swapped for another without touching the code that uses it. Phase B changes only what's *inside* the functions. Pages and gates stay the same. Phase B also deletes `samples.ts`, `dev-role.ts` and `DevRoleSwitcher.tsx`.

---

## 9. Where EN-06 stands (4 Nov 2026)

- **Phase A, everything that needs no backend:** built on `feature/webportalshell`, not yet committed. Checked with ESLint, TypeScript, a webpack production build and screenshots for every role.
- **Wireframe redesign (4 Nov):** the shell now follows the team's vendor and organiser wireframes (Decision 7). Some choices where the two wireframes disagree are waiting for review (open questions 13–17).
- **Phase B, the real login and data:** blocked on EN-03, EN-04, team AWS access and the NestJS-or-Amplify stack decision.

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
<summary>6. On a production build today, what happens when you open <code>/dashboard</code>?</summary>

You are sent to `/login`. The stand-in `getSession()` returns "nobody" outside `next dev`, so a deployed site can never run with a fake sign-in.
</details>

<details>
<summary>7. Which ticket builds the "My events" page?</summary>

Not EN-06. The shell only shows its "coming soon" place in the organiser sidebar. A feature ticket builds the page and drops it into the shell.
</details>
