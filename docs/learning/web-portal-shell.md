# Web portal shell: learning notes and decision record

> **Ticket:** [EN-06] Web portal shell, 10 points, in epic EP-00 Foundations (Jira space TES)
> 1. EN-06-T1 (5 pts): Next.js App Router with role-based layouts
> 2. EN-06-T2 (2 pts): Typed Amplify Data client; loading, error and empty-state components
> 3. EN-06-T3 (3 pts): Public, server-rendered routes for event and profile pages, read through guest access rules
>
> **Done when** (from the backlog): "Next.js portal with layouts for consumers, organisers, providers and admins" and "Event and profile pages render on the server and open without logging in". **Depends on:** EN-04 (authentication and role-based access).
>
> **Branch:** `feature/webportalshell` · **Started:** 2026-11-03 · **Status:** Phase A (the parts that need no backend) approved and being built on 3 Nov; see [Build order](#build-order). Checked against live Jira the same day (see [Live Jira](#live-jira-checked-2026-11-03)). Decisions 1, 3, 4 and 6 are *Accepted* for Phase A; the rest stay *Proposed* until the backend exists. On 4 Nov the shell was redrawn to follow the team's two portal wireframes (Decision 7, *Proposed*: its choices are waiting for Navindu's review).
>
> **Related notes:** [the theory, explained](web-portal-shell-explained.md) · [public pages and the portal](web-portal-shell-public-vs-portal.md) · [colour tokens after PR #14](web-portal-shell-colour-tokens.md) · [demo script, 5 Nov](web-portal-shell-demo-script.md)

## How to read this document

Every decision follows the same pattern:

1. **The problem**, in plain words
2. **Options** we looked at, with what is good and bad about each
3. **Decision** and why it won
4. **Gotchas**: things that look right but are not. Several were checked by experiment, not just by reading docs.

Each decision has a status: *Proposed* → *Accepted* (or *Changed*). If we change our minds later, we do not delete the old reasoning. We add a row to the [decision history](#decision-history) saying what changed and why. That history is the point of this document.

## TL;DR

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | How does each role get its own area? | One signed-in shell, `(portal)`, whose navigation and colours follow the user's role. Pages every role uses (dashboard, feed, messages, settings…) exist **once**. Role-only tools sit in gated folders: `/organiser`, `/vendor` (vendors and freelancers) and `/admin`. *Revised: was one folder per role; `/provider` → `/vendor` on 3 Nov.* |
| 2 | Where does a user's role come from? | **Cognito groups**: `attendee`, `organiser`, `vendor`, `freelancer`, `admin` (lowercase, as EN-04 created them in `amplify/auth/resource.ts`). **Exactly one per account**, added at sign-up by a small trigger. The backend ticket (EN-04) creates them; this ticket only reads them. *Revised: `ATTENDEE` → `CONSUMER` to match the backlog; then, on 18 Nov, to the lowercase names EN-04 actually built, with `attendee` instead of `CONSUMER`.* |
| 3 | Where is the role checked? | Three layers: `proxy.ts` (are you signed in? It protects every page except the public ones), a server-only `requireRole()` helper (do you have this role?), and Amplify Data auth rules (the real lock). In the backlog, the first two belong to EN-04-T4. |
| 4 | How do we read data with types? | Amplify Gen 2 `generateClient<Schema>()`. Types come straight from `amplify/data/resource.ts`, with no code generation. Three clients: browser, server-as-user, server-as-guest. |
| 5 | Loading, error and empty states? | Next.js special files (`loading.tsx`, `error.tsx`, `not-found.tsx`) plus three small components: `<LoadingState>`, `<ErrorState>`, `<EmptyState>`. Their text comes in as props, so it can move into translation files. |
| 6 | Public event and profile pages? | `/events/<id>`, `/organisers/<id>` and `/vendors/<id>`, server-rendered as a **guest** and cached for 60 seconds (`dynamic = 'force-static'` + `revalidate = 60`). Guests never see draft events or organiser contact details, and consumer profiles are **not** public. *Revised: was `/profiles/<id>`, then `/providers/<id>`.* |
| 7 | Use Next's new Cache Components (`'use cache'`)? | **Not yet.** It works (we tested it), but it switches caching rules for the whole app, and Amplify Hosting does not officially support Next 16 yet. Revisit before Next 17. |
| 8 | How do we build before the backend exists? (Decision 6) | Pages only call a few small functions (`getSession()`, `getPublicEvent()`…) and build links through one `routes` file. Until EN-03 and EN-04 exist, those functions return sample data in `next dev`, where a "View as" box in the bottom-right corner picks your role. Production builds get no data and no session. *New, 3 Nov.* |
| 9 | What should the shell look like? (Decision 7) | The layout both portal wireframes share: a top bar (logo, search, messages, notifications, role, profile), the sidebar as a rounded card in the role's colour, buttons beside each page title and an optional right-hand column of panels. Where the two wireframes disagree, each choice is written down. Text on the role colour is picked per palette, because white fails the contrast check on vendor green and consumer coral. *New, 4 Nov.* |

## Where we are starting from (2026-11-03)

- `apps/web`: Next.js **16.4.2**, React 19.3, TypeScript 6. pnpm workspaces + Turborepo, Node 24.
- Existing route groups: `(marketing)` (landing page) and `(auth)` (login). Danella's `feature/auth` branch (last commit 2 Nov) adds the auth layout and a brand panel. The login page is still just a heading, and `components/auth/LoginForm.tsx` is an empty placeholder.
- Styling is plain CSS + CSS Modules. **Role colour tokens already exist** in `globals.css` (`--att-*`, `--org-*`, `--ven-*`). It also has styles for an account-type screen with one card per role (`.role.att`, `.role.ven`, `.role.fre`; organiser is the default), but no page renders those cards yet.
- **There is no Amplify backend yet.** All 8 remote branches were checked on 3 Nov. The root `package.json` already expects one (`ampx sandbox`, `tsc -p amplify`).
- Hosting: Amplify Hosting builds `apps/web` (`amplify.yml` has a frontend phase only).
- `apps/api` is a NestJS API with a health check only. The PRD (v6) and the backlog have **no** NestJS: everything goes through Amplify. The team's planning notes (`HANDOFF.md` in the ATP repo) list this "stack conflict" as still to be settled. `next.config.ts` already forwards `/api/*` to that NestJS app (`API_URL`, default `localhost:4000`), so the proxy must leave `/api` alone.
- **`main` does not build (found 3 Nov).** Two separate problems, neither caused by this ticket:
  1. `(auth)/layout.tsx` and `(auth)/login/page.tsx` are empty files (added by PR #12). The TypeScript step fails with "is not a module". Danella's `feature/auth` branch fills them in, so they're fixed when that branch merges. We don't touch `(auth)`.
  2. On Windows, Turbopack (the default bundler in `next build` and `next dev`) can't load the Google font file that `app/layout.tsx` asks for: "next/font/google queries have exactly one entry". The font downloads fine, the folder path isn't the cause (tested from a drive with no spaces), and webpack (`--webpack`) builds it. Amplify Hosting builds on Linux, so it may not be affected. Until it's fixed, use `next dev --webpack` and `next build --webpack` on Windows.

## What the backlog says (checked 2026-11-03)

**Where this comes from.** The live backlog is in Jira (space TES). The Atlassian connector didn't load in the session that wrote this. So these facts come from:
- the backlog's export in the team's ATP planning repo (`research/tezera-work-items-jira.csv`, the file imported into Jira on 22 Oct);
- PRD v6;
- the vendor-portal wireframe (22 Oct);
- the organiser and vendor mind maps.

The export has no assignees, statuses or sprints. Those are in [Live Jira](#live-jira-checked-2026-11-03) below. Only 8 Jira tickets changed after the 22 Oct import, all status moves, so the ticket text in this section is still current.

**Where EN-06 sits.** EP-00 Foundations is a chain: EN-01 monorepo → EN-02 environments → EN-03 data schema → EN-04 authentication → **EN-06 web portal shell**.

| Ticket | What it owns | What it means for this ticket |
| --- | --- | --- |
| EN-01-T1 | Turborepo with `apps/mobile`, `apps/web`, the `amplify/` backend and `packages/shared` | Confirms the backend lives in a root `amplify/` folder (Decision 5). |
| EN-02 (T1–T3, T6) | Backends for `main` and `dev`, a preview backend per pull request, a personal sandbox per developer, an AWS login per team member (IAM Identity Center) | The deployment and AWS-access blockers belong here, not to this ticket. |
| EN-03-T1 | Core models: users; organiser, provider and consumer profiles; districts and categories | Three separate profile models, so each public profile type gets its own page (Decision 4). We don't write these models. |
| EN-04-T1, T2 | Cognito with **one group per role**; a post-confirmation Lambda that adds the user to their chosen group; auth rules on every model and custom operation | The group names come from here: organiser, vendor, freelancer, consumer, admin. Its "done when" says "each account is in exactly one group". |
| **EN-04-T4** | "Amplify Auth with server-side sessions in Next.js; protected routes and admin-only routes" | **Overlaps this ticket:** `proxy.ts`, `getSession()` and `requireRole()` are this task. Agree with its owner who builds them. |
| PG-01-T1, T4 | Sign-up with a role choice ("the role picked at sign-up sets the user's group"); the web sign-up, role-choice, log-in and reset pages | The sign-up form has to send the chosen role to the trigger. Probably `feature/auth`'s work (not confirmed). |
| PG-02-T1 | Consumer profile and privacy settings, "enforced on every read" | Consumer profiles aren't public by default, so guests get no access to them (Decision 4). |
| PG-05-T1 | Event model with **draft**, published, postponed and cancelled, plus change history | Drafts exist, so guests must not read every event record (Decision 4). |
| US-C03-T1, T3 | One query that loads everything the event page needs; the real public event page | We build the route, the data path and the caching. US-C03-T3 builds the page's design. |
| US-P01-T3, US-P04-T3 | Provider profile "public view"; organiser profile with past events and reviews | Same split as events: we build the routes, and those stories build the pages. |
| US-C15-T3, T4 | Shared links open the event page without logging in (in the app if it's installed); short links with a preview card | The reason event pages must be public and server-rendered. Keep `/events/<id>` stable, because the mobile app will open these links. Preview images are T4's job. |
| EN-07-T2, T4 | Design tokens from the brand manual; i18next with all text in translation files | State components take their text as props instead of hard-coded English (Decision 3). |
| EN-16-T2 | Role-access tests for every module | Tests that each role reaches only its own tools come later. EN-06 has no test task. |

**The portal is mostly shared pages.** The vendor-portal wireframe's sidebar has two groups:
- **General:** Dashboard, Feed and events, Messages, Community, Notifications, Reviews and rank, Profile, Settings.
- **Vendor tools:** Booking requests, Job posts, Stalls, My bookings, My stall listing, Payments, Verification.

The organiser and vendor mind maps share the same general areas and differ only in their tool areas. This changed Decision 1. The organiser wireframe (found on 4 Nov) has the same two-group sidebar with a slightly different General list. [Decision 7](#decision-7-following-the-wireframes) compares the two.

**PRD facts used below:**
- Each account holds exactly one role; someone who is both a freelancer and an attendee uses two accounts (section 3).
- The admin panel is part of the same Next.js app, behind admin-only routes (section 8).
- The organiser profile includes contact details (AC-02).
- Consumers choose who can see their profile (AC-06).
- Events can be postponed or cancelled and stay visible (EV-02).

Two questions in the PRD's section 14 are still open:
- Can organisers run private events with no public page (weddings)?
- Can unverified organisers publish events?

### Live Jira (checked 2026-11-03)

EN-06 is TES-228. Danella assigned it on 22 Oct and moved it to In Progress on 2 Nov. Its sub-tasks (TES-342, 343, 344) are unassigned and To Do. It sits in **TEZ Sprint 3**, which runs 22 Oct to midnight on 4 Nov (Sri Lanka time) with no sprint goal. Sprint 3 holds all seven Foundations stories (89 points); only EN-02 is Done. No Sprint 4 exists yet.

| Ticket | Owner | Jira status | What the code shows (3 Nov) |
| --- | --- | --- | --- |
| EN-01 Monorepo | Damian | In Progress; T1 and T3 Done | No `amplify/`, `apps/mobile` or `packages/shared`. No workflow runs lint or type-check; the only one syncs `dev` with `main` |
| EN-02 Environments | Damian | Done (set by Danella, 2 Nov) | Amplify Hosting builds the web app. All six sub-tasks are To Do: no backend per branch, no sandboxes, no AWS logins |
| EN-03 Data schema | Yevan | To Do | Nothing yet |
| EN-04 Auth | Danella | In Progress | `feature/auth`: login layout and brand panel. No Cognito yet. **EN-04-T4** (protected routes) has no assignee, so it is Danella's by default |
| EN-07 Design system | Reshan | In Progress | Nothing pushed. Reshan drew the vendor-portal wireframe |

PG-01 (sign-up and role choice) and the stories that build the real public pages (US-C03, US-P01, US-P04, PG-05) are unassigned and in no sprint. Four stories list EN-06 as a dependency: PG-05 (20 pts), US-A01 (15), US-C15 (13) and PG-18 (12).

## Words you will see (glossary)

- **App Router**: Next.js routing where folders inside `src/app` become URLs. `page.tsx` is the page. `layout.tsx` is UI that wraps every page below it and **stays mounted** while you move between those pages.
- **Route group `(name)`**: a folder name in brackets. It groups routes so they can share a layout **without changing the URL**. `(portal)/organiser/page.tsx` is served at `/organiser`.
- **Server Component**: the default in the App Router. It runs on the server, can fetch data directly and sends HTML. A **Client Component** (`'use client'` at the top) also runs in the browser; you need one for state, effects and click handlers.
- **Proxy (`src/proxy.ts`)**: code that runs before matching requests. In Next 16 it replaced `middleware.ts`.
- **Amplify Gen 2**: AWS's TypeScript-first way to define a backend (auth, data, storage) in code, inside an `amplify/` folder. `npx ampx sandbox` deploys your personal copy to AWS. It also writes `amplify_outputs.json`, the endpoints and IDs the frontend needs.
- **Amplify Data**: a GraphQL API (AWS AppSync) and DynamoDB tables generated from the schema in `amplify/data/resource.ts`. **Authorisation rules** on each model decide who may read or write it.
- **Cognito user pool**: accounts and sign-in; it gives out **tokens**. **Cognito groups** are labels on users (admin, organiser…) that appear inside those tokens. The **Cognito identity pool** hands out short-lived AWS credentials, including to **guests** (people who are not signed in).
- **SSR (server-side rendering)**: HTML built on the server for every request. **ISR (incremental static regeneration)**: HTML built once, cached, then rebuilt in the background after N seconds.
- **DAL (data access layer)**: one folder of server-only functions that every page uses to fetch data and check permissions, so a check cannot be forgotten.
- **Custom query**: a GraphQL operation you define yourself (`a.query()`), with its own auth rules and a small resolver. Use one for reads that model rules can't express, such as "published events only".
- **Field-level rule**: an auth rule on a single field of a model, for example a phone number that only signed-in users may read.

---

## Decision 1: Role-based layouts

**Status:** Accepted for Phase A (3 Nov). Built with a stand-in session (Decision 6); the real sign-in check arrives with EN-04.

### The problem

Tezera has four account types plus admins:
- consumers (the proposal and the brand manual call them attendees);
- organisers;
- vendors and freelancers, together called "providers" in the PRD. They share one palette and nearly every tool; freelancers just don't have stalls;
- admins.

**Each account holds exactly one role** (PRD section 3). The backlog asks for "layouts for consumers, organisers, providers and admins".

Most of the portal is the same for every role: dashboard, feed and events, messages, community, notifications, reviews, profile and settings. Three things differ:
- the navigation;
- the colours;
- a set of role-only tools: hiring and the map builder for organisers, booking requests and stall applications for providers, and queues for admins.

Anyone who isn't signed in, or doesn't have the role, must not get into those tools.

### 1a. How to lay out the routes

| Option | Looks like | Good | Bad |
| --- | --- | --- | --- |
| **F. One shell with role-aware navigation, plus gated folders for role-only tools** | `/messages` for everyone; `/organiser/hiring`, `/vendor/requests`, `/admin/reports` | Shared pages exist **once**, so a link in a notification or an email works for everyone. Matches the wireframe and the mind maps. The shell picks the nav and palette from the role, and each tools folder has its own gate. URLs still say what you're looking at. | The shell layout has to know the role (one cached session read per request). `/dashboard` shows different content per role. That's fine here: each account has exactly one role, so nobody needs a link to another role's dashboard. |
| A. One folder per role, with everything inside it | `/organiser/messages`, `/vendor/messages`, `/attendee/messages` | Each role's area is fully separate, with its own `layout.tsx`, nav and palette. Easy to protect by URL prefix. | The wireframe and mind maps show most pages are shared, so they would exist three or four times (or need re-export files). A link to a shared page would need to know the reader's role. **Our first choice; replaced on 3 Nov** (see the [decision history](#decision-history)). |
| B. One `/dashboard` with `if (role === …)` everywhere | `/dashboard` shows different things per role | Fewest folders. | Every page branches on role, and role-only tools can't be protected folder by folder. Gets messy fast. Option F keeps the one useful part of B: a per-role dashboard. |
| C. Parallel routes (`@organiser`, `@consumer` slots) | Same URL; the slot is picked by role | An official Next.js pattern ("conditional routes"). | The Next docs warn that every slot still renders and ends up in the response even when hidden. That means wasted API calls, and possible data leaks unless each slot re-checks the role. Each slot needs a `default.tsx`, and navigation has confusing edge cases. Too much for a first project. |
| D. Proxy rewrites by role | `/dashboard` silently rewritten to a hidden per-role path | Tidy URLs. | Routing becomes invisible "magic". The token is decoded on every request. The same URL returns different content, which complicates caching and debugging. |
| E. A separate Next.js app per role (multi-zones) | Four apps | Complete isolation. | Huge overkill for a student team. |

**Decision: F.**

What Phase A built (3 Nov). BUILT = in the branch now; LATER = Phase B. Existing groups are untouched:

```text
apps/web/src/
├── proxy.ts                          LATER signed-in check on every non-public URL (+ token refresh)  ← EN-04-T4
├── lib/
│   ├── roles.ts                      EN-04 the four sign-up roles and their auth-screen wording (Danella)
│   ├── portal-roles.ts               BUILT portal roles = roles.ts + admin (= Cognito group names), labels, palettes
│   ├── routes.ts                     BUILT every URL in one place (Decision 6)
│   ├── format.ts                     BUILT dates in Sri Lanka time, "A, B and C" lists
│   ├── auth/session.ts               BUILT getSession() stand-in, requireSession(), requireRole()
│   ├── auth/dev-role.ts              BUILT the development-only "View as" cookie
│   └── data/                         BUILT types.ts, samples.ts, public.ts (getPublicEvent() and friends)
├── components/
│   ├── Palette.module.css            BUILT role palette → --t/--b/--p/--s/--a
│   ├── states/                       BUILT LoadingState, ErrorState, EmptyState (+ text.ts)
│   ├── portal/                       BUILT PortalShell, PortalNav, nav.ts, PageHeader, DevRoleSwitcher;
│   │                                       4 Nov: TopBar, Columns, Panel, ButtonLink, icons (Decision 7)
│   └── public/                       BUILT shared styles, labels, ContactDetails (locked for visitors)
└── app/
    ├── layout.tsx                         root (unchanged; Phase B adds the Amplify browser config)
    ├── global-error.tsx              BUILT last-resort error page
    ├── not-found.tsx                 BUILT "Page not found" for unknown URLs
    ├── (marketing)/ …                     landing page (unchanged)
    ├── (auth)/ …                          login / sign-up (Danella's, unchanged)
    ├── (public)/                     BUILT anyone can see; server-rendered and cached
    │   ├── layout.tsx · error.tsx         header with "Log in"; no loading.tsx (see Decision 3)
    │   ├── events/[eventId]/              page · not-found
    │   ├── organisers/[organiserId]/      page · not-found
    │   └── vendors/[vendorId]/            page · not-found   (vendors AND freelancers)
    └── (portal)/                     BUILT signed-in area
        ├── layout.tsx · error.tsx         the shell: reads the role → that role's top bar, sidebar + palette
        ├── dashboard/                     page · loading; one URL for everyone, shows your role's dashboard
        │                                  (shared pages come later from their own tickets: feed, messages,
        │                                   community, notifications, leaderboards, reviews, profile,
        │                                   settings; the sidebar shows them as dashed "coming soon" pills)
        ├── organiser/                     layout + page call requireRole('organiser') · loading
        ├── vendor/                        layout + page call requireRole('vendor', 'freelancer') · loading
        └── admin/                         layout + page call requireRole('admin') · loading
```

Consumers have no tools folder yet; everything they do is a shared page. If a consumer-only page appears later (say, "events I'm going to"), it gets a gated folder the same way.

`/dashboard` is the one "after sign-in, go here" URL for the auth flow. Each account has exactly one role, so it needs no role picker:
- **one role**: show that role's dashboard;
- **no role**: show an empty state asking them to finish setting up. A failed sign-up trigger would surface here.

`/dashboard` must require only sign-in, not a role. Otherwise a user with no group would bounce between redirects forever.

The shell sets a `data-palette` attribute (`Palette.module.css`) that maps the generic colour variables (`--t`, `--b`, `--p`, `--s`, `--a`) to the role's palette. It's the same trick the account-type cards in `globals.css` already use, so every component inside picks up the right colours automatically. Which role gets which palette lives in one place, `ROLE_PALETTE` in `lib/portal-roles.ts`:
- attendees → the attendee palette (`att`);
- organisers → `org`;
- vendors and freelancers → `ven` (the existing `.role.ven, .role.fre` rule already shares it);
- admins → the default organiser palette (proposed).

**Naming (decided 3 Nov).** Vendors and freelancers share the URL word **`vendor`**: their tools are at `/vendor/…` and their public profiles at `/vendors/<id>`. That matches how the team talks ("vendors" covers vendors, freelancers and other providers), the wireframe's "Vendor tools" and the brand manual's vendor palette. The PRD's word for the same group is "providers", and its "vendor" means businesses only, so two things keep the code honest:
- The Cognito groups stay `vendor` and `freelancer`. The `/vendor` gate lists both, with a comment saying not to narrow it.
- On screen, freelancers see "Freelancer tools" and "Freelancer" on their profile; only the URL says "vendor".

A role's own tools use the singular (`/organiser/…`, "my organiser workspace"); public pages use the plural (`/organisers/<id>`, "organiser 45 of all organisers"), the same pattern as `/events/<id>`. Options considered: `provider` (Claude's recommendation: matches the PRD), `vendor` (chosen), and separate `vendor` and `freelancer` folders (rejected: almost every tool page would exist twice). Every URL is built in `lib/routes.ts`, so a later rename means that file plus the folder names, and a permanent redirect once real links are being shared.

### 1b. Where the role comes from

| Option | Good | Bad |
| --- | --- | --- |
| **Cognito groups** | Inside the access token (`cognito:groups`), so there is no database lookup. The **same** groups drive Amplify Data rules (`allow.group('admin')`), so the UI and the API agree. | A small Lambda (a "post-confirmation trigger") has to add the user to a group. Changes show up when the token refreshes, which can take up to about an hour. |
| A custom attribute `custom:role` | Easy to set at sign-up. | Amplify Data rules cannot use it directly. If it is editable, users could edit it themselves and promote themselves. |
| A `role` field on a Profile record | Flexible. | Needs a database read on every request. Data rules cannot use it. |

**Decision: Cognito groups.** The backlog and the PRD already specify this (EN-04-T1, PRD section 8), so the real decision belongs to the backend. This ticket just reads the group.

- **Group names** (EN-04-T2): EN-04 created `attendee`, `organiser`, `vendor`, `freelancer` and `admin` (`amplify/auth/resource.ts`). Cognito group names are case-sensitive, so the portal uses exactly these words (`lib/portal-roles.ts`). Until 18 Nov this doc and the code used `ORGANISER`, `VENDOR`, `FREELANCER`, `CONSUMER` and `ADMIN`.
- **How a user gets one** (PG-01-T1, EN-04-T1): the role picked at sign-up is sent with the sign-up, for example as an attribute that can't be changed later. The post-confirmation trigger then adds the matching group. The trigger must only accept the self-service roles: attendee, organiser, vendor and freelancer. **admin is assigned by hand, never from user input.**
- **Exactly one group per account** (EN-04's "done when"). Our code still copes with zero groups (see `/dashboard` above). The session has one `role` field, not a list. In Phase B, exactly one known group becomes that role, and zero or several become "no role". That's safer than letting a two-group account into both areas.

> **Nobody can pick a role in the UI yet.** `globals.css` has styles for an account-type screen, but no page renders it, and the backlog puts the web role-choice page in PG-01-T4. Agree the hand-off with whoever builds it (probably Danella, on `feature/auth`).

### 1c. Where the role is checked (defence in depth)

> **Backlog note:** layers 1 and 2 below are EN-04-T4 ("protected routes and admin-only routes"). EN-06 depends on EN-04. So either EN-04-T4's owner builds them first, or we agree that this branch builds them as part of EN-04-T4.

The Next.js authentication guide is clear that **layouts are not a security boundary**:

> "Due to Partial Rendering, be cautious when doing checks in Layouts as these don't re-render on navigation … A layout also does not control whether the rest of the route renders … a layout that hides or swaps them does not stop them from running or from appearing in the RSC Payload."

So there are three layers, each with one job:

| Layer | Question it answers | Why it is there |
| --- | --- | --- |
| 1. `src/proxy.ts`, running on **every URL except the public ones** (landing page, login and sign-up, `/events`, `/organisers`, `/vendors`, static files; also `/api`, which goes to the NestJS app) | Is anyone signed in? If not, go to `/login?next=…` | A fast bounce before any rendering. **It also refreshes expired tokens and saves them as cookies.** Server Components cannot write cookies; we read the Amplify adapter's source, and it silently ignores writes there. Shared pages (`/messages`, `/settings`…) will keep being added at the top level, so the proxy protects everything by default and lists only the public paths. A page someone forgets to list stays protected instead of open. Public paths return straight away, without reading cookies, so they stay cacheable (to confirm in the build check). |
| 2. `requireRole('organiser')` in `lib/auth/` (server-only, wrapped in React `cache()`) | Does this user have the role? If not, send them to `/dashboard` | Called in each tools folder's `layout.tsx` **and** in every page or data loader inside it. Next treats that page-level call as the real check. Shared pages call `requireSession()` instead (signed in, any role). Thanks to `cache()`, calling these many times in one request costs one lookup. |
| 3. Amplify Data authorisation rules | May this identity read or write this record? | The real lock. If a UI check is ever missed, the API still refuses. |

**Wrong role → `redirect('/dashboard')`, not `forbidden()`.** `forbidden()` returns a proper 403 page, but it is still **experimental** in Next 16.4 (it needs `experimental.authInterrupts`). We avoid experimental flags in a shared team codebase and can revisit once it is stable.

`requireSession()` and `requireRole()` are built (`lib/auth/session.ts`) and every portal layout and page already calls them. Only `getSession()` is a stand-in until EN-04 (Decision 6). In Phase B its body becomes this sketch, and nothing that calls it changes:

```ts
// lib/auth/session.ts, Phase B version of getSession() (sketch)
export const getSession = cache(async (): Promise<Session | null> =>
  runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (ctx) => {
      const { tokens } = await fetchAuthSession(ctx);
      if (!tokens) return null;
      const groups = (tokens.accessToken.payload['cognito:groups'] as string[] | undefined) ?? [];
      const known = groups.filter(isRole);
      // exactly one group per account (EN-04); zero or several → no role, never "both"
      return { userId: String(tokens.accessToken.payload.sub), role: known.length === 1 ? known[0] : null };
    },
  }),
);
```

What's built today, for reference:

```tsx
// app/(portal)/layout.tsx: draws the sidebar and palette only; it is not the security check
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <PortalShell role={session.role}>{children}</PortalShell>;
}

// app/(portal)/vendor/layout.tsx: the gate for vendor tools (vendors AND freelancers)
export default async function VendorToolsLayout({ children }: { children: React.ReactNode }) {
  await requireRole('vendor', 'freelancer');
  return <>{children}</>;
}
```

```ts
// src/proxy.ts (Phase B, simplified)
const PUBLIC = [/^\/$/, /^\/(login|signup)(\/|$)/, /^\/(events|organisers|vendors)(\/|$)/]; // + whatever (auth) adds

export default async function proxy(request: NextRequest) {
  if (PUBLIC.some((path) => path.test(request.nextUrl.pathname))) return NextResponse.next();

  const response = NextResponse.next();
  const signedIn = await runWithAmplifyServerContext({
    nextServerContext: { request, response }, // lets Amplify write refreshed tokens back as cookies
    operation: async (ctx) => {
      try {
        return (await fetchAuthSession(ctx)).tokens !== undefined;
      } catch {
        return false;
      }
    },
  });
  if (signedIn) return response;
  const login = new URL('/login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // every path except /api, Next's own files and static images (the pattern from the Next.js docs)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
```

---

## Decision 2: Typed Amplify Data client

**Status:** Proposed

### The problem

Pages need to read and write Tezera data (events, profiles…), and TypeScript should know the exact shape of every record. That way typos and missing fields are caught before the app runs.

### Options

| Option | Good | Bad |
| --- | --- | --- |
| **A. Amplify Gen 2 `generateClient<Schema>()` + the Next.js adapter's server clients** | Types are **inferred** straight from `amplify/data/resource.ts`. Change the schema and the types update instantly, with no generator to run. It handles sign-in tokens, guest credentials and request signing for us. The official, documented path. | Ties us to Amplify, which is fine because the backend is Amplify. Returns `{ data, errors }` instead of throwing, so we add a tiny helper. |
| B. GraphQL code generation (`ampx generate graphql-client-code`) | Works for clients without TypeScript. | Extra generated files that must be kept in sync. This is the older Gen 1 style, with more boilerplate. |
| C. Apollo Client or urql pointed at AppSync | Popular GraphQL tools with a client cache. | We would have to rebuild AWS request signing and token refresh ourselves. Much more setup. |
| D. Go through the NestJS API (`apps/api`) | One place for business logic. | An extra network hop, duplicated auth, and types are not shared automatically. The PRD and the backlog have no NestJS at all: custom logic goes in Lambda functions behind custom queries. |

**Decision: A.**

### One schema, three clients

The adapter package `@aws-amplify/adapter-nextjs` provides different clients for different places. All three are typed by the same `Schema`:

| Client | Runs in | Acts as | Use it for |
| --- | --- | --- | --- |
| `generateClient<Schema>()` from `aws-amplify/data` | The browser (Client Components) | The signed-in user | Forms, buttons, live updates. Subscriptions only work in the browser. |
| `generateServerClientUsingCookies<Schema>({ config, cookies })` | Server Components, Server Actions, Route Handlers | The signed-in user (reads their cookies) | Portal pages. Reading cookies makes the page render per request, which is right for private data. |
| `generateServerClientUsingReqRes<Schema>({ config, authMode: 'identityPool' })`, called inside `runWithAmplifyServerContext({ nextServerContext: null, … })` | The server | **A guest**: no cookies are read at all | Public event and profile pages. With no cookies, the page can be cached and shared by everyone. |

The `nextServerContext: null` → guest behaviour is barely documented. We confirmed it in the adapter's source (`createRunWithAmplifyServerContext.ts`): *"When `null` is passed as the value of `nextServerContext`, opt-in unauthenticated role (primarily for static rendering)."*

Files (BUILT in Phase A, LATER in Phase B):

```text
apps/web/src/lib/
├── amplify/                   LATER
│   ├── outputs.ts             the only file that imports amplify_outputs.json
│   ├── ConfigureAmplify.tsx   'use client': Amplify.configure(outputs, { ssr: true })
│   └── server.ts              'server-only': createServerRunner + the two server clients
├── data/
│   ├── types.ts               BUILT hand-written public types → LATER derived from Schema with SelectionSet
│   ├── samples.ts             BUILT sample records for `next dev` → LATER deleted
│   ├── public.ts              BUILT getPublicEvent(), getPublicOrganiser(), getPublicVendor() → LATER guest-client reads
│   └── result.ts              LATER unwrap(): { data, errors } → data, or throws DataError
└── auth/
    └── session.ts             BUILT requireSession(), requireRole(); getSession() is a stand-in until EN-04
```

The `Schema` type comes from the backend's `amplify/data/resource.ts` (EN-03). Until that file exists, the functions in `public.ts` use the hand-written types in `types.ts` and return sample data in `next dev`. Pages only call the functions, so they won't change when the insides do. See [Decision 6](#decision-6-building-before-the-backend-exists) and the [build order](#build-order).

`{ ssr: true }` tells the browser to keep tokens in **cookies** instead of localStorage, which is how the server finds out who is signed in. `ConfigureAmplify` is mounted once in the root layout. That is the simplest setup and avoids "Amplify has not been configured" errors, at the cost of a small extra download on the landing page.

### Typing what a component receives

Amplify's `SelectionSet` type turns "the fields we asked for" into a TypeScript type, so a card cannot use a field we never fetched:

```ts
import type { SelectionSet } from 'aws-amplify/data';
import type { Schema } from '@backend/data/resource'; // path alias → repo-root amplify/

export const eventCardFields = ['id', 'title', 'startsAt', 'venueName'] as const;
export type EventCard = SelectionSet<Schema['Event']['type'], typeof eventCardFields>;
```

On public pages this also stops us fetching private fields by accident. Next.js also generates `PageProps<'/events/[eventId]'>` and `LayoutProps<…>` types, so route `params` are typed too.

### Handling `{ data, errors }`

Amplify Data does **not** throw when the API returns an error; it returns `{ data, errors }`. If a page forgets to check `errors`, a failure looks like "there's nothing here". One helper fixes that everywhere:

```ts
// lib/data/result.ts
export class DataError extends Error {
  constructor(readonly errors: ReadonlyArray<{ message: string }>) {
    super(errors.map((e) => e.message).join('; '));
    this.name = 'DataError';
  }
}

export function unwrap<T>(result: { data: T; errors?: ReadonlyArray<{ message: string }> }): T {
  if (result.errors?.length) throw new DataError(result.errors);
  return result.data;
}
```

The rule is simple:
- **errors** → throw, which shows the nearest `error.tsx`;
- **`get` returns `null`** → `notFound()`;
- **`list` returns `[]`** → `<EmptyState>`.

---

## Decision 3: Loading, error and empty states

**Status:** Accepted and built (3 Nov). Files: `components/states/`, the `error.tsx` and `loading.tsx` files listed in Decision 1, `app/not-found.tsx` and `app/global-error.tsx`.

### Options

| Option | Good | Bad |
| --- | --- | --- |
| **A. Next.js special files + three small components** | `loading.tsx`, `error.tsx` and `not-found.tsx` are built into the App Router, which wires them to Suspense and error boundaries for us. The components are reused inside them and anywhere else. | You need to learn which file catches what (table below). |
| B. Hand-written `isLoading`/`error` state in every page | Familiar from single-page React apps. | Every page repeats the same `useEffect` code. It doesn't work for Server Components, and the error branch is easy to forget. |
| C. A client data library (TanStack Query or SWR) for everything | Great caching, retries and optimistic updates. | Moves fetching into the browser, which is bad for SEO pages. Another library to learn. |
| D. A UI kit (Amplify UI, MUI) for the state components | Ready-made. | Fights the existing brand CSS and per-role palettes. Heavy. |

**Decision: A.** C is **deferred** until a feature really needs browser-side caching, such as live chat or the venue map. Amplify's docs have a TanStack Query guide for when we get there.

### What catches what

| Situation | Mechanism | What the user sees |
| --- | --- | --- |
| A page or section of the URL is loading | `loading.tsx` (Next wraps the page in `<Suspense>` for us) | `<LoadingState>` skeleton |
| One section is loading while the rest shows | `<Suspense fallback={<LoadingState />}>` around that section | `<LoadingState>` |
| Something threw while rendering | `error.tsx` (must be a Client Component). It receives `error` and **`retry()`**, which became stable in Next 16.3. | `<ErrorState onRetry={retry}>` |
| One section failed but the rest of the page is fine | `catchError()` from `next/error` (stable since 16.3) | `<ErrorState>` in that section only |
| The root layout itself crashed | `app/global-error.tsx`, which renders its own `<html>` | A minimal error page |
| The record doesn't exist | `notFound()` → `not-found.tsx` | "Event not found" |
| The list is empty | A plain `if (items.length === 0)` | `<EmptyState>` with a title, explanation and action |

Component rules:

- **`<LoadingState>`** uses `role="status"` with hidden "Loading…" text for screen readers. The skeleton shimmer is switched off for people who set `prefers-reduced-motion`.
- **`<ErrorState>`** shows a friendly message and a **Try again** button. In production it shows `error.digest`, a reference code that matches the server log, not the raw message. Next deliberately hides server error messages in production.
- **`<EmptyState>`** has a title, a one-line explanation and an optional action link ("Create your first event"). It's a Server Component, so it ships no JavaScript.
- All three use CSS Modules and the existing tokens in `globals.css`, so they take on the current role's palette automatically. EN-07-T2 will later swap in design tokens from the brand manual.
- **Text comes in as props.** The PRD wants all interface text in translation files from the start (section 7), and EN-07-T4 sets up i18next. So the components take `title`, `description` and `action` props instead of hard-coding English. The few defaults ("Loading…", "Try again", "Go to the home page") live in one place, `components/states/text.ts`, so EN-07-T4 can move them into translation files.
- **Heading level as a prop.** `headingLevel` is 1 when the state is the whole page ("Event not found") and 2 or 3 when it sits inside one, so screen-reader users get a sensible outline.
- **Buttons are outlined, not filled.** White text on the vendor and attendee primary colours fails contrast (the brand manual review already flagged 2.2:1). Outlined buttons use the palette's own text colour, which passes in every palette, light and dark.

> **Hosting gotcha:** Amplify Hosting does **not** support Next.js streaming. On a full page load (typing the URL or refreshing), the server waits until everything is ready before sending HTML, so `loading.tsx` won't appear. It still appears instantly when moving between pages inside the app. Nothing in this design depends on streaming; just don't be surprised by it.

> **Where `loading.tsx` goes matters (found by testing, 3 Nov).** A `loading.tsx` wraps everything *below* its folder in a loading boundary. Once that boundary's skeleton has been sent, the status code can't change any more:
> - **At the `(portal)` level** it also wrapped the tool folders' layouts. A vendor opening `/organiser` got a `200`, a skeleton and a delayed `<meta refresh>` instead of a real `307` redirect. The protected content was never sent, but it looked broken. Fix: each portal folder (`dashboard`, `organiser`, `vendor`, `admin`) has its own `loading.tsx`. That wraps only the page next to it, so the layout's role check finishes first and redirects for real. Tested: `307` → `/dashboard`.
> - **At the `(public)` level**, a missing event sent the skeleton as its HTML. Public pages are cached and quick, so they have **no** `loading.tsx`.
> - **Even without one**, `notFound()` inside a page makes Next send a bare shell with status `404` and `noindex`. The "Event not found" message is in the page's data and drawn by the browser as soon as its JavaScript runs. Search engines and link previews go by the status, so that's fine. If we ever need the message in the HTML itself, Next's docs suggest checking existence in `proxy.ts` before the page renders (Phase B).

---

## Decision 4: Public, server-rendered event and profile pages (guest access)

**Status:** Routes, caching and page skeletons built (3 Nov). Tested on a production build: found pages come back `200` with the content in the HTML, and the second visit is a cache `HIT`. Guest-access reads (4a) wait for the backend (EN-03, EN-04).

### The problem

Anyone must be able to open an event page (`/events/<id>`) and an organiser's, vendor's or freelancer's profile (`/organisers/<id>`, `/vendors/<id>`). That includes people who aren't signed in, and the bots that build WhatsApp and Instagram link previews.

The backlog's reason (US-C15): *"Given a friend does not have Tezera installed, when they open the link, then the event opens on the web portal without logging in."* The survey evidence behind it: 25 of 26 attendees find events on Instagram, and 22 through friends.

- The HTML must come from the server, for search engines and link previews.
- The data must be read under **guest** rules, never with a signed-in user's or an admin's permissions.
- Guests must see only what is meant to be public: no draft events, no private contact details, no consumer profiles.

### 4a. How guests are allowed to read

| Option | Good | Bad |
| --- | --- | --- |
| **A. `allow.guest().to(['read'])`** (Cognito identity pool, unauthenticated role) | What the ticket asks for. No key to expire. Amplify generates a tightly scoped IAM policy. The same guest identity can read public event images from Storage later. Guest access is on by default in Gen 2. | An uncached read takes two network steps (get guest credentials, then query). The credentials step also disables Next's automatic caching; see 4b. |
| B. `allow.publicApiKey()` | Simplest: one network step. | API keys **expire** after a number of days that we set (AppSync allows at most 365). Forget to redeploy and every public page breaks. Fine for prototypes. |
| C. Read through the NestJS API | Full control. | An extra service, an extra hop and duplicated auth. |
| D. Render in the browser instead | No server work. | No HTML for search engines or link previews, and a slower first view. |

**Decision: A, guest access through the identity pool.** The first draft put a guest read rule on every public model:

```ts
// First draft (3 Nov). Fine for profiles, NOT for events: see below.
Event: a.model({ /* … */ }).authorization((allow) => [
  allow.guest().to(['read']),         // public pages (server, acting as a guest)
  allow.authenticated().to(['read']), // signed-in users browsing inside the portal
  allow.owner(),                      // the organiser who created it
  allow.group('admin'),               // moderation
]),
```

The backlog showed this is too wide for events. A model-level read rule lets that caller read **every** record with `get` or `list`, and events have drafts (PG-05-T1). That's true for guests and for signed-in users. So the rule now depends on the data:

| Data | Rule | Why |
| --- | --- | --- |
| **Events** | Guests and other users must never read drafts. Two ways for the backend to do it:<br>1. No read rule for other people on `Event`. They read through a **custom query**, such as `getPublicEvent(id)` with `allow.guest()`, that returns nothing for drafts.<br>2. Keep drafts in a separate owner-only model and copy them into a public `Event` model on publish, so `Event` keeps plain read rules. | 1 fits the backlog: US-C03-T1 already plans one event-page query, and custom queries accept `allow.guest()` (static rules only). The catch is that every other list of events (feed, search) also needs a query. 2 keeps lists simple, but publishing and taking an event down become copy and delete steps. **The choice is the backend's** (EN-03, EN-04-T2, PG-05). Our `getPublicEvent()` hides it, so pages don't change. PRD section 14 may also add private events and limits on unverified organisers, so one place that decides what's public helps. |
| **Organiser and provider profiles** | `allow.guest().to(['read'])` on the two models, with a **field-level rule** on anything private | These are business listings meant to be found (US-P01 "Be found by organisers I don't know"; organisers carry a Verified badge, US-C05). The organiser profile includes contact details (AC-02). **Decided 3 Nov: hidden from visitors who aren't logged in; anyone logged in, whatever their role, can see them.** The cached public page can't contain them, so it shows a "Log in to see how to contact this organiser" box (`components/public/ContactDetails.tsx`). In Phase B that box loads the details in the browser for a logged-in viewer. Field-level rules **do not inherit** the model's rules (Amplify docs), so a locked field needs its own full list (owner, signed-in readers, admins). Our guest field lists leave such fields out, so guest reads never ask for them. |
| **Consumer profiles** | No guest access, so no public page in this ticket | Consumers choose who can see their profile (AC-06), "enforced on every read" (PG-02-T1). A static guest rule can't respect a per-person setting. |

These rules live in the backend (EN-04-T2, US-C03-T1, PG-05-T1), not in this branch. This ticket asks for them and calls them. A sketch of option 1 plus the profile rules:

```ts
Event: a.model({ /* … */ }).authorization((allow) => [
  allow.owner(),        // the organiser who created it
  allow.group('admin'), // moderation
]),                     // everyone else reads through queries such as getPublicEvent

PublicEvent: a.customType({ id: a.id().required(), title: a.string(), startsAt: a.datetime() /* public fields only */ }),

getPublicEvent: a
  .query()
  .arguments({ id: a.id().required() })
  .returns(a.ref('PublicEvent'))
  .authorization((allow) => [allow.guest(), allow.authenticated()])
  .handler(a.handler.custom({ dataSource: a.ref('Event'), entry: './getPublicEvent.js' })),
  // the resolver reads the event and returns null unless it is published, postponed or cancelled

OrganiserProfile: a
  .model({
    /* public fields … */
    contactPhone: a.phone().authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),
  })
  .authorization((allow) => [
    allow.guest().to(['read']),
    allow.authenticated().to(['read']),
    allow.owner(),
    allow.group('admin'),
  ]),
```

The query returns its own `PublicEvent` type, not the `Event` model, which keeps the public fields explicit. Amplify's docs don't say whether a guest query may return a model type that has no guest rule; test that in a sandbox before relying on it.

Signed-in users are **not** guests. When they use the identity pool they get the *authenticated* role, which is why the `authenticated` rules are there for reads inside the portal. Our server-rendered public pages always read as a guest, so every visitor gets the same, cacheable HTML.

### 4b. How the page is rendered and cached

We tested every option on **the exact Next.js version in this repo (16.4.2)**, using a mock server that makes the same HTTP calls Amplify makes. Details are in the [experiment log](#experiment-log).

| Option | What we measured | Verdict |
| --- | --- | --- |
| Plain SSR (no settings) | Fetches from the backend on every request | Works, but slowest. A fine fallback. |
| `export const revalidate = 60` only | **Still fetches on every request**: the page silently became dynamic | **Trap.** See below. |
| **`export const dynamic = 'force-static'` + `export const revalidate = 60`** | First visit MISS, then HIT (no backend call) until 60 s pass | **Chosen.** |
| `unstable_cache()` around the data call | Cached | Works, but it's marked "unstable" and being replaced by `'use cache'`. |
| Cache Components (`cacheComponents: true` + `'use cache'` + `cacheLife`) | Cached | Works. **Deferred**; see below. |

**The trap, explained.** To get guest credentials, Amplify calls Cognito with `fetch(…, { cache: 'no-store' })`; we found this in the `@aws-amplify/core` source. In Next's classic caching model, a `no-store` fetch quietly switches the whole page to dynamic, so `revalidate = 60` does nothing.

`force-static` tells Next: "this page is the same for everyone, cache it anyway". A side effect is that `cookies()` and `headers()` return nothing on these pages, which is exactly what a public page should do. The "Sign in / Go to dashboard" button in the public header becomes a small Client Component that checks sign-in in the browser.

**Why not Cache Components yet.** It is where Next.js is heading: it's on by default for new apps and will be compulsory in the next major version. Our test shows it works with Amplify. Two things hold it back for now:
- It changes caching rules for the **whole app**, including teammates' pages.
- AWS's page lists Amplify Hosting support only "up through Next.js 15", and no streaming.

Our public data functions live in one folder, so moving to `'use cache'` later means changing a few lines there.

**Freshness trade-off.** Amplify Hosting doesn't support **on-demand** revalidation (`revalidatePath` / `revalidateTag`). When an organiser edits, postpones or cancels an event, the public page can be up to 60 seconds out of date; the notifications to people going (US-C06) still go out at once. That's acceptable for event pages, and we can lower the number if needed.

The live parts of the event page come later, from their own stories: 'Going' counts, public Q&A (MS-06) and live status (US-C07). They will be small Client Components that fetch fresh data or subscribe to updates, so the cached HTML around them can stay a minute old.

**No backend calls during the build.** We don't list event IDs at build time (no `generateStaticParams`), so CI never needs AWS access to build. Each page is generated on its first visit and then cached; this was verified in the experiment.

**Search engines and link previews.** Each page exports `generateMetadata()` with a title and description. It calls the same data function as the page, and React `cache()` makes sure the API is hit only once per render. The preview image, with cover, title, date and venue, and the short links belong to US-C15-T4.

```tsx
// app/(public)/events/[eventId]/page.tsx (built; shortened here)
export const dynamic = 'force-static'; // same HTML for every visitor → cacheable
export const revalidate = 60;          // rebuilt in the background at most once a minute

type EventPageProps = { params: Promise<{ eventId: string }> }; // Next's generated PageProps<'/events/[eventId]'> works too

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await getPublicEvent((await params).eventId);
  return event ? { title: event.title, description: event.summary } : {};
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await getPublicEvent((await params).eventId);
  if (!event) notFound(); // drafts come back as null too, so they look exactly like a missing event
  return <article>…</article>;
}
```

### 4c. Data-exposure gotchas (important for the PDPA)

`allow.guest().to(['read'])` makes **every record and every field** of that model readable by anyone, including through `list`. Therefore:

- **Drafts.** Events *do* get a draft state (PG-05-T1), which is why events no longer get a plain guest rule (4a). The first draft of this doc said "when that happens, switch to custom queries". The backlog says it happens from day one.
- **Private fields** (phone, email, NIC, verification documents). Either keep them **off** any model guests can read (for example in a separate owner-only model), or lock each one with a field-level rule. Don't rely on everyone remembering to leave them out of queries. Sri Lanka's Personal Data Protection Act makes this a must. According to the PRD (section 7), its processing rules start on 1 January 2027, though the PRD says the official gazette still needs checking. The PRD also says NIC and registration documents are visible to admins only.
- **Taken-down and suspended accounts.** An admin can unpublish a fake event, and the report queue (PG-18) may suspend people. Whatever the backend does for those must also hide them from guests. That's one more reason to keep the "what is public" rule in one place.
- **URLs** use IDs for now (`/events/<id>`). Keep them stable: the mobile app will open shared event links (US-C15-T3), and short links (US-C15-T4) will redirect to them. Friendly slugs (`/events/colombo-food-fest`) can come later, using a secondary index and a redirect to the main URL.

---

## Decision 5: Backend location, config file and deployment

**Status:** Proposed

### Where the Amplify backend lives

| Option | Good | Bad |
| --- | --- | --- |
| **`amplify/` at the repo root** | Matches what the root `package.json` already expects (`ampx sandbox`, `tsc -p amplify`). One backend shared by web and, later, mobile. | The web app imports types from outside its folder, so we add a `@backend/*` path alias. |
| A `packages/backend` workspace package | A clean package boundary; Amplify's monorepo docs lean this way when there are several frontends. | Contradicts the team's existing scripts and means more setup. Revisit when the mobile app starts. |

**Decision:** root `amplify/`. The backlog agrees: EN-01-T1 sets up Turborepo with `apps/mobile`, `apps/web`, the `amplify/` backend and `packages/shared`.

### Where `amplify_outputs.json` goes

The sandbox generates this file for each developer, and it is git-ignored. **Proposed:**
- generate it into `apps/web/` by adding `--outputs-out-dir apps/web` to the root `sandbox` script;
- import it in exactly one file, `lib/amplify/outputs.ts`.

The mobile app can generate its own copy later with `ampx generate outputs`.

### Deployment (not part of this ticket, but it blocks merging)

`amplify.yml` only builds the frontend today. Once the web app imports `amplify_outputs.json`, the hosted build will fail unless the pipeline creates that file. There are two ways:
- a `backend` phase that runs `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID`; or
- `npx ampx generate outputs --app-id … --branch …` before `next build`.

Either needs AWS console access and team agreement. In the backlog it is a separate task, **EN-02-T1** ("main and dev branches each deploy their own backend"), with EN-02-T2 adding a backend for each pull-request preview. It must be done **before** this branch is merged to `main`. Each developer's AWS login is EN-02-T6 (IAM Identity Center).

Our app is on Next 16, but AWS's support page only lists versions up to 15. We should test SSR and ISR on a preview deployment early.

---

## Decision 6: Building before the backend exists

**Status:** Accepted and built (3 Nov).

### The problem

EN-06 depends on EN-04, which depends on EN-03, and neither has started (see [Live Jira](#live-jira-checked-2026-11-03)). Waiting means nothing to show or test this sprint. Building against a fake backend risks code that has to be thrown away.

### Options

| Option | Good | Bad |
| --- | --- | --- |
| **A. Small stand-in functions, with sample data in `next dev` only** | Pages call `getSession()`, `getPublicEvent()` and friends, never the backend. In Phase B only those functions' insides change, whether the team stays on Amplify or picks NestJS. Production builds return nothing, so a deployed site can't show made-up data or let anyone in. | About 150 lines of throwaway code (the sample data and the "View as" switch) that Phase B deletes. |
| B. A placeholder Amplify backend in this branch | Real data calls from day one. | It's EN-02 to EN-04's work, needs AWS access nobody has yet (EN-02-T6), and would collide with Yevan's and Danella's backend. Dropped on 3 Nov. |
| C. A mock API server (such as MSW) | Exercises real network calls. | Another tool to learn and set up, for code that changes again in Phase B. |
| D. Wait for EN-03 and EN-04 | No throwaway code. | Nothing to demo this sprint, and the four stories waiting on EN-06 slip further. |

**Decision: A.**

### How it works

- **`getSession()`** (`lib/auth/session.ts`) says who is signed in.
  - In `next dev`, it's the role picked in the **"View as (development only)"** box, which floats in the bottom-right corner (it sat at the bottom of the sidebar until 4 Nov). That box sets a cookie; organiser is the default, and "No role yet" shows the dashboard's empty state.
  - In production builds it returns nobody, so every portal page redirects to `/login`.
  - It reads cookies in every mode, like the real one will, so portal pages stay rendered per request.
- **`getPublicEvent()`, `getPublicOrganiser()` and `getPublicVendor()`** (`lib/data/public.ts`) return records from `lib/data/samples.ts` in `next dev`, and nothing (so "not found") in production builds. The samples include a draft, `/events/evt-sample-draft`, to show that drafts never come back.
- **`lib/routes.ts`** builds every URL, so renaming a URL word means changing one file plus the folder names.
- The `NODE_ENV` checks are fixed when the app is built: `next build` sets `production`, so the development-only branches are dead code there.

**Try it:** run `pnpm dev:web`, open `/dashboard` and change the "View as" box. Public pages:
- `/events/evt-sample-1`
- `/events/evt-sample-2` (postponed)
- `/organisers/org-sample-1`
- `/vendors/ven-sample-1` (a vendor)
- `/vendors/ven-sample-2` (a freelancer)

**Phase B** deletes `samples.ts`, `dev-role.ts` and `DevRoleSwitcher.tsx`, and fills in the real `getSession()` and data reads.

## Decision 7: Following the wireframes

**Status:** *Changed* on 19 Nov: the shell now follows the team's Figma high-fid files (organiser, vendor, freelancer), which replace the two wireframes compared below. See the [decision history](#decision-history). The original text is kept for the reasoning.

*Before 19 Nov:* built 4 Nov. Navindu asked for the shell to follow the two portal wireframes in the ATP repo. The choices below where the two disagree are Claude's and are waiting for review.

### The problem

Phase A took only the vendor wireframe's **sidebar items**. Its look was a plain grey sidebar, which neither wireframe has. The ATP repo has two portal wireframes, both drawn "in the consumer flow's layout" (the team's consumer wireframe, `tezera-consumer-flow.html`, which isn't in the repo):

| | Vendor portal | Organiser flow |
| --- | --- | --- |
| Where | `brand/tezera-vendor-portal/` on `main` (PR #9, merged) | `wireframes/tezera-organiser-wireframe.html` on branch `docs/organiser-flow` (PR #10, **still open**) |
| Who, when | Reshan, 22 Oct | Navindu with Claude, 28 Oct |
| What | 18 linked HTML pages, desktop only (no phone layout) | 32 SVG screens (O01–O32), 8 journeys, light and dark |

**What they share (the template).** Both are 1440px desktop screens:
- a top bar: logo (two dots and "tezera"), a search bar, round messages and notifications buttons, a chip with the role, an avatar that opens the profile;
- a sidebar drawn as a rounded card in the role's main colour, with two centred headings: "General" and "<role> tools". The current page is a white pill;
- a main column whose title has its buttons on the right ("Create event", "Post a job");
- a 340px right-hand column of tinted panels ("Needs your attention", "Coming up", "Recent messages", "Your rank").

The organiser file writes down the colour rule: **card = primary, pills and panels = secondary, search = accent**. The vendor portal follows it too: its panels are a tint of the vendor secondary blue-grey.

**Their reasoning:**
- Things you need on every page (search, messages, notifications, your profile) live in the top bar. So the bell isn't repeated in the organiser sidebar.
- The sidebar lists places, not actions. Actions are buttons beside the page title.
- An organiser works one event at a time. The map, stalls, hiring, Q&A and board are **six tabs inside each event** (screen O09), not sidebar items. So "Organiser tools" is short: My events, Hiring, Feed and promotion.
- Home is the overview. Neither wireframe has a separate "tools overview" page.

### Options

| Option | Good | Bad |
| --- | --- | --- |
| A. Keep Phase A (wireframe items, our own look) | Nothing to change. | Looks like neither wireframe. The demo and the designs disagree. |
| **B. Build the shared template once, and follow each wireframe's reasoning for its own role** | One shell for every role, as Decision 1 already says. It matches both wireframes, and any differences are written down. | Where the two disagree, someone has to choose (table below). |
| C. Copy each wireframe exactly, one look per role | Pixel-faithful. | Two shells to maintain, and consumers and admins have no wireframe at all. White text on the role colour fails the contrast check (below). |

**Decision: B.**

### Where the two wireframes disagree

| Item | Vendor portal | Organiser flow (= consumer flow) | Chosen | Why |
| --- | --- | --- | --- | --- |
| First item | Dashboard | Home | **Home** (the page title stays "Dashboard") | It's the template's word, and the logo goes there too |
| Events item | Feed and events | Explore events | **Feed and events**, for everyone | One shared page should have one name. PR #10 itself says "Explore events isn't an organiser feature" |
| Reviews | Reviews and rank | Leaderboards + Reviews | **Leaderboards + Reviews** | Everyone browses leaderboards, and every role except admin writes or gets reviews. Phase A hid reviews from consumers; the template shows them |
| Notifications | in the sidebar and the bell | the bell only | **The bell only** | Both have the bell, so listing it twice adds nothing |
| Inactive sidebar items | no fill | pale pills | **Pale pills** | Dark text on a pale pill passes the contrast check on every card colour. Dark text straight on the organiser slate is 2.7:1 |
| Verification | in Vendor tools | opens from Profile | Each role as drawn | Two different choices; worth agreeing on one (open question 13) |
| Organiser payments | — | "not drawn yet" (PR #10) | **Kept in Organiser tools** | From the organiser mind map, until the wireframe draws it |
| Phase A's "Overview" tool links | — | — | **Removed** | Home is the overview. `/organiser`, `/vendor` and `/admin` still exist and the dashboard's button opens them |

Consumers and admins have no wireframe here. They get the same frame, with search hints and dashboard panels marked *proposed* in the code.

### What was built (4 Nov)

- `TopBar.tsx`: logo, search, messages, notifications, role chip, profile. Search, messages, notifications and the profile belong to other tickets (US-C01, EP-09, EN-09-T4, the profile stories). They follow the sidebar's rule: no `href` in `nav.ts` means "shown, but not a link yet". The search box is disabled until then.
- The sidebar card, its pills and the centred headings. Pages that aren't built yet are **dashed outline pills** with "coming soon" in a tooltip and for screen readers. The first try used a "SOON" tag, but it pushed longer names ("Feed and promotion", "Booking requests") onto two lines in the 224px card.
- `PageHeader` takes `actions`, and `ButtonLink` draws them (outlined, or `primary` filled in the role colour).
- `Columns` (main column plus a 340px right-hand column, stacked below 1200px) and `Panel` (one tinted card, with an empty line until there's data). The dashboard uses both, with each role's panel titles from the wireframes.
- Sizes from the wireframes at 1440px: a 224px card with 36px gutters, a page area of 1112px (744 + 28 + 340), and an 84px top bar.
- Phones and narrow windows aren't in either wireframe. Below 900px the search moves to its own row and the card folds into a "Menu" bar. Below 480px the role chip is hidden.
- Unread counts and the bell's red dot are left out until there's data for them (messaging and EN-09).

### Colour and contrast

The wireframes put white text on the card. That works on organiser slate (5.5:1) but fails on vendor green (2.7:1) and consumer coral (3.0:1). Normal text needs 4.5:1. So `Palette.module.css` gained **`--on-p`**, the text colour on a `--p` fill, set per palette and theme:

| Palette | Light | Dark |
| --- | --- | --- |
| Organiser | white, 5.5:1 | dark navy on light slate, 5.2:1 |
| Vendor | its dark text, 7.5:1 | its dark background colour, 4.7:1 |
| Consumer | its text darkened by 25%, 5.1:1 (the plain text colour is 4.3:1) | white, 7.7:1 |

In dark mode `--p` is a light tint, so the card is drawn as a dark mix of it (30% `--p`), like the organiser wireframe's dark screens. Its text is the palette's normal light text (6.4:1 or better). The pills, the panels and the search bar are mixes of `--s` and `--a` with the background (`color-mix`), so dark mode needs no extra rules for them. The landing page's coloured buttons (`.go.ven` in `globals.css`) have the same white-on-green problem. That's outside this ticket, but worth telling Yevan and Reshan.

### Gotchas

- **A sticky top bar inside the page grid doesn't stick.** A grid item's sticky box can't leave its own grid cell, and a top bar's cell is exactly its own height. So the top bar sits outside the grid, and only the sidebar and page share it (`.body`).
- **`satisfies` keeps narrow types.** `{ label: "Search" }` checked with `satisfies Record<string, NavItem>` has no `href` property as far as TypeScript knows, so `TOP_BAR.search.href` didn't compile. `TOP_BAR` now has an explicit type.
- **The wireframes' sizes are for a 1440px drawing.** Their 13px sidebar text is too small for real use, so the pills use 15px and are slightly taller.

---

## Not part of this ticket

The backlog gives the neighbouring work to other tickets. This branch uses their results but doesn't build them:

- **The backend:** environments (EN-02), the data models (EN-03), Cognito groups and auth rules (EN-04-T1, T2), and the event-page query (US-C03-T1).
- **Sign-in and sign-up pages**, including the role choice (PG-01-T4, probably `feature/auth`).
- **The real sign-in check** (`proxy.ts` and the real `getSession()`) is EN-04-T4. `requireSession()` and `requireRole()` are already built here and called everywhere, so EN-04-T4 only fills in `getSession()` and adds `proxy.ts` (open question 7).
- **The real page designs:** the event page (US-C03-T3), the vendor and freelancer profile (US-P01-T3), the organiser profile (US-P04-T3) and the consumer profile (PG-02-T3). This ticket ships the routes with plain placeholder content.
- **Sharing:** share buttons, short links and preview images (US-C15).
- **Design tokens and translations** (EN-07). We use today's `globals.css` tokens and keep text out of the components.
- Ticketing, payments, venue maps and chat.

## Build order

The backend belongs to EN-02 to EN-04, so this branch has no placeholder backend. We build what doesn't need AWS first, behind small functions (Decision 6), and wire Amplify in once the backend exists.

### Phase A: built on 3 Nov (no backend needed)

1. **State components:** `<LoadingState>`, `<ErrorState>` and `<EmptyState>` with their CSS, plus `global-error.tsx` and the app-wide `not-found.tsx`.
2. **Portal shell:** `<PortalShell role>` with each role's sidebar and palette, the `(portal)` folders, role locks on `/organiser`, `/vendor` and `/admin`, and placeholder pages.
3. **Public route skeletons:** `/events/<id>`, `/organisers/<id>` and `/vendors/<id>`, with the caching settings, page titles for link previews, error and not-found. Contact details are locked for visitors.
4. **Stand-ins** (Decision 6): `getSession()` with the "View as" switch, sample data, and `lib/routes.ts`.

Checks run: see the [experiment log](#phase-a-checks-3-nov). Nothing is committed yet; it goes to `main` as a pull request after review.

**4 Nov:** the shell redrawn after the two wireframes (Decision 7): top bar, sidebar card, title buttons, right-hand column and panels, and `--on-p`. Still no backend needed. A copy of the 3 Nov files is in that session's scratchpad (`phase-a-backup/`), because untracked files can't be restored with git.

### Phase B: needs EN-03, EN-04 and the stack decision

5. **Amplify wiring:** `outputs.ts`, `ConfigureAmplify`, the server runner, the three clients and `unwrap()`. Swap the hand-written types for `Schema`-based ones.
6. **Real sign-in:** the real `getSession()` (sketch in 1c) and `proxy.ts`, by whoever owns EN-04-T4. Delete the "View as" switch.
7. **Real public reads:** guest-client reads in `lib/data/public.ts`, delete the sample data, and load organiser contact details for logged-in viewers.
8. **Check:** lint, type-check and build as in Phase A, then a sandbox, then an Amplify preview deployment (Next 16 on Amplify Hosting is unverified).

### Running it on Windows (3 Nov)

- `pnpm install`. If `pnpm` isn't found, use `corepack pnpm install`.
- `pnpm dev:web` works normally.
- `pnpm build` currently fails on Windows (the Turbopack font error under [Where we are starting from](#where-we-are-starting-from-2026-11-03)). Use `pnpm exec next build --webpack` inside `apps/web`. On `main` it also fails everywhere until the empty `(auth)` files are filled in by `feature/auth`.
- `next dev` writes `apps/web/AGENTS.md` (notes for AI coding tools) every time it starts. The team should decide whether to commit it, as Next suggests, or switch it off with `agentRules: false` in `next.config.ts`. It isn't part of EN-06.

## Open questions

**Answered on 3 Nov** (live Jira, plus Navindu's decisions):

1. **Who builds the backend?** EN-02 Damian (marked Done, but its sub-tasks are To Do), EN-03 Yevan (not started), EN-04 Danella (In Progress; so far the login page's look).
2. **AWS access:** not yet. EN-02-T6 (a login per person) is To Do. Ask Damian, who set up Amplify Hosting. Once you have a login:
   1. install the AWS CLI;
   2. run `aws configure sso`;
   3. run `npx ampx sandbox --profile <your profile>`.
3. **Role names:** organisers, vendors (vendors and freelancers), consumers and admins. The Cognito groups are organiser, vendor, freelancer, consumer and admin, one per account.
4. **Which profiles are public?** Organisers', vendors' and freelancers'. Consumer profiles follow each person's privacy settings (AC-05, AC-06, PG-02), so guests can't read them.
5. **Organiser contact details:** hidden from visitors who aren't logged in; anyone logged in can see them (Decision 4).
6. **URL words:** `/organiser/…`, `/vendor/…` and `/admin/…` for tools; `/events/<id>`, `/organisers/<id>` and `/vendors/<id>` for public pages (Decision 1).

**Still open:**

7. **EN-04-T4** (protected routes) has no assignee, but it sits under Danella's EN-04, so it's hers by default. `requireSession()` and `requireRole()` already exist in this branch. Agree with Danella who writes the real `getSession()` and `proxy.ts`.
8. **Hand-off with Danella:**
   - after login, go to `/dashboard`, or to the page in `?next=` if there is one;
   - how the sign-up form passes the chosen role to Cognito.

   PG-01-T4 (the sign-up and login pages) is unassigned, but `feature/auth` is building them.
9. **Stack:** NestJS or Amplify only? On the NestJS side: `apps/api`, the `/api` forwarding in `next.config.ts`, and the 15 Oct slide-deck stack. On the Amplify side: PRD v6 and the whole backlog. Phase A works either way; Phase B needs the answer.
10. **Drafts:** will the backend hide them with a custom query or a separate draft model (4a)? Ask Yevan (EN-03) and Danella (EN-04).
11. **"Other providers":** a third account type, or businesses the PRD already counts as vendors? Either way they'd use `/vendor`.
12. **`main` doesn't build:** the empty `(auth)` files (fixed when `feature/auth` merges) and, on Windows only, the Turbopack font error. Worth telling the team before anything else merges.

**New on 4 Nov (Decision 7), for Navindu and the team:**

13. **Verification:** the vendor wireframe puts it in Vendor tools; the organiser wireframe opens it from Profile. Pick one place for every role?
14. **The General list:** confirm Home, Feed and events, and Leaderboards plus Reviews. PR #10 already asks whether to keep "Explore events" for organisers.
15. **Consumer and admin pages:** no wireframe in the repo. The consumer flow (`tezera-consumer-flow.html`) should be saved in ATP next to the other two (ATP `HANDOFF.md`, next step 11). Then the consumer's search hint and dashboard panels can be checked against it.
16. **Tell Reshan (EN-07):** white text on vendor green fails the contrast check. The shell uses dark text there (`--on-p`), and the design tokens should carry the same rule.
17. **Unread counts:** the vendor wireframe shows counts on Messages, Notifications and some tools, and both show a red dot on the bell. They wait for messaging (EP-09) and notifications (EN-09). Agree with those tickets where the counts come from.

**New on 4 Nov (evening):**

18. **How far should the public side go?** Full public pages (built), teaser only (proposed) or sign-in for everything. A link preview is fetched by a signed-out visitor, so whatever it shows is public. See [public pages and the portal](web-portal-shell-public-vs-portal.md). Decision 4 is unchanged until the team decides.
19. **Where do the brand colours live, and is there a dark mode?** PR #14 removed both from `globals.css`. The shell keeps its own copy of the colours for now, light only. EN-07 should give them one shared home. See [colour tokens after PR #14](web-portal-shell-colour-tokens.md).

## Experiment log

**Date:** 2026-11-03. **Setup:** Next.js 16.4.2 (same as the repo), Node 24.21.0, Windows 11, in a throwaway app outside the repo.

A local mock server counted requests. Each "Amplify-like" read did what Amplify does for a guest:
1. a `POST` to Cognito Identity with `cache: 'no-store'`;
2. a `POST` to AppSync with no cache option.

| Variant | Build output | Unseen ID, request 1 | Request 2 |
| --- | --- | --- | --- |
| No settings | ƒ dynamic | backend called | backend called again |
| `revalidate = 60` | ƒ dynamic | backend called | **backend called again** |
| `force-static` + `revalidate = 60` | ● prerendered | MISS (backend called) | **HIT, no backend call** |
| Same, without `generateStaticParams` | ○ static | MISS | **HIT** |
| Same, with `generateStaticParams` returning `[]` | ○ static | MISS | **HIT** |
| `unstable_cache` + `revalidate = 60` | ● prerendered | MISS | HIT |
| `cacheComponents` + `'use cache'` + `cacheLife('minutes')` | ◐ partial prerender | backend called | no further calls (3 requests → 1 backend call) |

Also checked by reading the published package source:

- `@aws-amplify/adapter-nextjs@1.8.1` declares support for `next >=13.5.0 <17.0.0` (npm registry). Amplify's SSR docs page still says `<16.0.0`; the docs are behind the package.
- `nextServerContext: null` → guest (unauthenticated) credentials, and no cookies are read (`utils/createRunWithAmplifyServerContext.ts`).
- In Server Components the adapter can't write cookies; it catches the error and does nothing (`utils/createCookieStorageAdapterFromNextServerContext.ts`). Refreshed tokens are therefore saved by `proxy.ts`.
- `@aws-amplify/core` uses `cache: 'no-store'` for Cognito Identity calls (`foundation/factories/serviceClients/cognitoIdentity/constants.ts`).

### Phase A checks (3 Nov)

In the repo itself, Next.js 16.4.2. Builds used `--webpack` because of the Windows font error. The two empty `(auth)` files got a one-line placeholder during each build and were restored right after, so they're unchanged.

| Check | Result |
| --- | --- |
| `eslint` | 0 errors. One old warning in `(marketing)/page.tsx`, not ours |
| `tsc --noEmit` | Passes |
| `next build --webpack` | Portal routes `ƒ` (per request); public routes `○` (static, cached) |
| Production server: `/dashboard`, `/organiser`, `/vendor`, `/admin` | `307` → `/login` (nobody is signed in) |
| Production server: public pages | `404` + `noindex` (no sample data in production); `x-nextjs-cache: HIT`, `s-maxage=60` |
| Production with sample data switched on (temporary experiment, reverted) | `/events/evt-sample-1`: `200` with the event in the HTML; second request `HIT` |
| Dev server, wrong role (vendor opens `/organiser`) | Before the fix: `200` + skeleton + `<meta refresh>`. After moving `loading.tsx` into each folder: `307` → `/dashboard` |
| Dev server, right role | `200` with that role's sidebar, badge and colours |
| Dev server, draft event | `404`; "Event not found" drawn in the browser |
| Screenshots (headless Edge, 20 pages) | Every role at 1280 px, phone at 390 px with the menu closed and open, and dark mode. All pages landed where expected |
| `next dev` (Turbopack) on Windows | Works; only `next build` hits the font error |

### Wireframe pass checks (4 Nov)

Same setup. The `(auth)` files were stubbed for the build and restored with `git checkout` afterwards.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passes. The only errors are the known empty `(auth)` files |
| `eslint` | 0 errors; the same old warning in `(marketing)/page.tsx` |
| `next build --webpack` | Passes; same routes as Phase A (portal `ƒ`, public `○`) |
| Contrast (WCAG formula, in Node) | Text on the card, the role chip and primary buttons is 4.7:1 or better in every palette and theme; pill and panel text 7:1 or better. The numbers are in Decision 7 |
| Screenshots (headless Edge, 16) | Every role's dashboard at 1440px (the wireframes' width); organiser tools; no role; 1280px and 1024px (the right-hand column moves under the main one); phone at 390px with the menu closed and open; dark mode for organiser, vendor and consumer; a vendor opening `/organiser` lands on `/dashboard`. Compared side by side with the wireframe screenshots; the "SOON" tags that wrapped were replaced with dashed pills, then shot again |
| Not checked | Clicking through by hand, a screen reader, Safari |

## Versions checked (npm, 2026-11-03)

| Package | Latest | Notes |
| --- | --- | --- |
| `next` | 16.4.4 | The repo pins 16.4.2 |
| `aws-amplify` | 6.22.2 | |
| `@aws-amplify/adapter-nextjs` | 1.8.1 | Supports `next >=13.5.0 <17.0.0` |
| `@aws-amplify/backend` | 1.25.1 | |
| `@aws-amplify/backend-cli` | 1.10.0 | Needs Node `>=22`; we use 24 |

## Sources

- Next.js: [Authentication guide](https://nextjs.org/docs/app/guides/authentication), [`forbidden()`](https://nextjs.org/docs/app/api-reference/functions/forbidden), [`error.js`](https://nextjs.org/docs/app/api-reference/file-conventions/error), [`catchError`](https://nextjs.org/docs/app/api-reference/functions/catchError), [Caching with Cache Components](https://nextjs.org/docs/app/getting-started/caching)
- Amplify: [Next.js server-side rendering](https://docs.amplify.aws/nextjs/build-a-backend/server-side-rendering/), [Data from the Next.js server](https://docs.amplify.aws/nextjs/build-a-backend/data/connect-from-server-runtime/nextjs-server-runtime/), [Public data access](https://docs.amplify.aws/nextjs/build-a-backend/data/customize-authz/public-data-access/), [User-group access](https://docs.amplify.aws/nextjs/build-a-backend/data/customize-authz/user-group-based-data-access/), [Guest access](https://docs.amplify.aws/nextjs/build-a-backend/auth/concepts/guest-access/), [Add user to group](https://docs.amplify.aws/nextjs/build-a-backend/functions/examples/add-user-to-group/), [Custom business logic](https://docs.amplify.aws/nextjs/build-a-backend/data/custom-business-logic/)
- Amplify: [Customize your auth rules](https://docs.amplify.aws/nextjs/build-a-backend/data/customize-authz/). Field-level rules "do not inherit model-level authorization rules", and custom queries accept static rules, including `allow.guest()`.
- AWS: [Amplify Hosting support for Next.js](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)
- Team docs, from the private ATP repo (`Tezera-LK/ATP`):
  - `research/tezera-work-items-jira.csv`, the backlog export imported into Jira on 22 Oct;
  - `prd/tezera-prd.html`, PRD v6, sections 3, 6.1, 6.2, 6.8, 7, 8 and 14;
  - `research/tezera-user-stories.html` (US-C15);
  - `brand/tezera-vendor-portal/`, the vendor-portal wireframe (22 Oct);
  - `wireframes/tezera-organiser-wireframe.html` on branch `docs/organiser-flow`, the organiser wireframe (28 Oct, PR #10, open), and `HANDOFF.md` on that branch for its reasoning;
  - `mindmaps/`, the organiser and vendor maps;
  - `HANDOFF.md`, for the stack conflict.
- Classmethod: [adapter-nextjs v1.7.0 adds Next.js 16 support](https://dev.classmethod.jp/articles/aws-amplify-adapter-nextjs-v1-7-0-next-js-16/) (in Japanese)

## Decision history

| Date | Change |
| --- | --- |
| 2026-11-03 | First draft. All decisions *Proposed*, waiting for approval. |
| 2026-11-03 | **Backlog check**, from the 22 Oct Jira export, PRD v6, the vendor-portal wireframe and the mind maps (the Jira connector didn't load). All decisions are still *Proposed*. |
| | **Decision 1:** option A (one folder per role) → option F (one shared shell plus gated tools folders). The wireframe and mind maps show most pages are shared, and each account has exactly one role. `ATTENDEE` → `CONSUMER` and `/vendor` → `/provider`, to match the backlog. `/dashboard` no longer needs a role picker. The proxy now protects every path except the public ones. |
| | **Decision 3:** component text comes in as props, ready for translation files. |
| | **Decision 4:** `/profiles/<id>` → `/organisers/<id>` and `/providers/<id>`. Consumer profiles aren't public. Events are no longer readable through a plain guest rule, because drafts exist; the backend picks a custom query or a separate draft model. Organiser contact details are hidden from guests (proposed). |
| | **Build order:** no placeholder backend in this branch, because the backend is EN-02 to EN-04. Backend-independent parts come first. |
| | **Corrected:** the first draft said users already pick a role on the landing page. Only the CSS for that screen exists. |
| 2026-11-03 | **Live Jira check** (the connector loaded): owners, statuses and Sprint 3 dates added. EN-02 is marked Done while its sub-tasks are open. |
| | **Decided by Navindu:** organiser contact details hidden from visitors; URL word `vendor` for vendors and freelancers (`/provider` → `/vendor`, `/providers/<id>` → `/vendors/<id>`); Phase A approved. |
| | **Phase A built**, not committed. New Decision 6 (stand-ins). `data-role` → `data-palette`. The session holds one `role` instead of a list of groups. Testing showed the loading boundary swallowing redirects and 404s, so public pages have no `loading.tsx` and the portal's loading files moved into each folder. Buttons are outlined, for contrast. |
| 2026-11-04 | **New Decision 7 (Proposed):** the shell follows the template the vendor and organiser wireframes share. Top bar, sidebar card, title buttons, right-hand column and panels are built. Text on the role colour is set per palette (`--on-p`), because the wireframes' white text fails contrast on green and coral. |
| | **Decision 1, sidebar:** "Dashboard" → "Home"; Notifications moves to the top-bar bell; "Reviews and rank" → Leaderboards plus Reviews, with Reviews shown to consumers too. Organiser tools → My events, Hiring, Feed and promotion, and Payments: Stalls and Venue map builder move into each event, and Verification opens from Profile. The "Overview" links go; the dashboard's title button opens each tools page instead. "Soon" tags → dashed pills. |
| 2026-11-04 | **Colours restored** (evening). PR #14, pulled at 16:05, removed the role colours, `--page-muted`, `--page-line`, dark mode and the `body` margin reset from `globals.css`, so the shell lost every colour. The colours now live in the shell's own CSS (`Palette.module.css`, `Public.module.css`), light theme only like the rest of the site. The margin is reset again, only while a shell page is on screen. Polish for the 5 Nov demo: "View as" floats in the bottom-right corner; public cards get a soft shadow. See [colour tokens after PR #14](web-portal-shell-colour-tokens.md). |
| | **Public scope reopened.** Navindu leaned towards sign-in for everything, then asked how far the public side should go so that shared WhatsApp links keep working. Proposal: teaser-only public pages (open question 18). Decision 4 and the code are unchanged until the team decides. See [public pages and the portal](web-portal-shell-public-vs-portal.md). |
| 2026-11-18 | **Committed and rebased onto `dev`** (`e124948`, PR #24), not pushed. `dev` now has EN-04's Amplify auth: Cognito groups `attendee`, `organiser`, `vendor`, `freelancer` and `admin`, and Danella's sign-up and log-in screens under `(auth)/[role]/`. The only git conflict was `lib/roles.ts`, which both branches added. Dev's file is kept as it is because about 20 auth files use it. The portal's roles move to the new `lib/portal-roles.ts` (dev's four roles plus `admin`), and every `requireRole()` call uses the lowercase group names. `CONSUMER` → `attendee`. **Not a git conflict but worth agreeing on:** dev's `(auth)/[role]/page.tsx` sends a bare `/vendor` or `/organiser` to that role's log-in page, but our static `/vendor` and `/organiser` tools pages take priority, so signed-out visitors there now go to `/login` (→ `/attendee/login`) instead. `/attendee` and `/freelancer` still redirect as before. |
| 2026-11-19 | **Decision 7 changed: the shell follows Figma exactly.** The team's Figma high-fid files replace the HTML wireframes: organiser (O01–O103), organiser until verified (N01–N32), vendor and freelancer, each with light and dark pages. They have no styles or variables, so their literal values are copied into `Palette.module.css` as `--page`, `--pill`, `--pill-ink`, `--current-ink`, `--field`, `--field-ink`, `--muted`, `--avatar` and `--logo-2` (organiser and vendor values from Figma; consumers keep mixed values, as they have no file yet). Sizes from O05: 84px top bar, 224px card with a 24px radius, 34px pills with an 8px radius, 40px round buttons, 20px-radius panels, white cards on a tinted page. Body text is now **Instrument Sans** (bundled like Bricolage, loaded on portal pages only); titles stay Bricolage Grotesque. |
| | **Sidebar, from Figma:** Notifications is back in General (as well as the bell); "Feed and events" is gone. Organiser General: Home, Messages, Community, Notifications, Leaderboards, Reviews, Profile, Settings. Organiser tools add Analytics and Verification. Vendor and freelancer General has one "Reviews and rank" item instead of Leaderboards and Reviews; their tools add Availability. Pages not built yet now look like the other pills (Figma draws no difference); they still aren't links and screen readers hear "coming soon". |
| | **Kept on purpose, unlike Figma:** dark text on the vendor green (`--on-p`), because Figma's white text there is 2.7:1, under the 4.5:1 minimum. Light theme only; the dark pages' values go into tokens when dark mode comes back. |
| 2026-11-19 | **Slice 2, organiser Home pages from Figma:** the dashboard (O05: next-event card, "Your events" table, "Needs your attention", "Your rank"), the bell's dropdown (O81), the profile menu (O82), `/notifications` (O06, tabs by `?type=`) and `/search` (O80, tabs by `?tab=`; the top bar's search box is now live). Data comes from `lib/data/portal.ts`, which follows Decision 6: sample records from `portal-samples.ts` in `next dev`, nothing in production. Sample times are built from the current time, so "Tonight" and "Today" stay true. Only organisers have sample dashboards and notifications; other roles keep the placeholder dashboard and see an empty notifications page. Buttons and rows that open screens from later slices (event pages, hiring, settings…) are drawn but aren't links yet (`MaybeLink`), like the sidebar's unbuilt pages. Left out on purpose: the "Should" tag on O06's right-hand panel (a MoSCoW priority marker on the design, not part of the UI). |
| 2026-11-19 | **Slices 3 and 4, an organiser's events from Figma:** My events (O07, tabs by `?tab=`), create event (O08), edit (O54 for a published event: change banner, "Was …" hints, venue-map warning, "Who is told"; the create form for a draft), published (O51), preview (O52), and one event's pages: overview (O09, with Live status and announcements), Q&A (O15), board (O16), unpublished by an admin (O55) and after the event (O57). Postpone, cancel and the announcement check (O10, O53, O56) are dialogs opened with `?dialog=`, so they work without JavaScript and the back button closes them. All under `/organiser/events` (`routes.myEvents`, `manageEvent`, `editEvent`…). |
| | **A stand-in event store** (`lib/data/event-store.ts`) keeps the organiser's events in the dev server's memory, so creating, publishing, editing, postponing, cancelling, answering questions and sending announcements work end to end in `next dev`. It resets when the dev server restarts and is never used in production, where every write returns "needs the backend (EN-03)". The dashboard and the public event page (`/events/<id>`) read from it too, so a newly published event has a working public page. Phase B replaces it with Amplify Data. |
| | **Left for later slices, drawn but not links:** the Map, Stalls and Hiring tabs, cover-image upload (needs storage), board posting and replies, reviews, marking bookings complete, and the unpublished page's two buttons. **Added where Figma had no field:** a ticket-price input under "Paid entry", and a new-start-time input under "Running late". The "Should" and "Proposed" tags in O08 and O09 are left out, as in slice 2. |
| | **Known:** a wrong event id shows the not-found page but with status 200, because `(portal)/organiser/loading.tsx` streams the response first (the same gotcha as Decision 3's notes). |
| 2026-11-19 | **Slice 5, an event's stalls from Figma:** the Stalls tab (O13, `routes.eventStalls`) lists stall slots, applications and invitations, and approved vendors, with the stall fees and venue map panels beside them. Its dialogs open with `?dialog=`: open or edit slots (O72), invite a vendor (O73), a vendor's listing with Hide per item (O74), approve with a stall number (O75, reused for "Give a number" and "Add"), and reject with a reason (O76). A second stand-in store (`lib/data/stall-store.ts`) keeps each event's stalls in `next dev`, so all of these save, and approving keeps the event's "stalls approved" count in step. A cancelled or finished event's stalls are read-only. |
| | **Not in Figma, added:** a taken stall number shows in grey and can't be picked (Figma draws every square white). Approving refuses when every slot of the type is taken, and a number another stall has is refused. Dates in the slots dialog use the browser's date picker, not Figma's "Fri 27 Nov" text. **Left for later slices:** Payments and Open map builder (drawn, not links), and telling vendors (EN-09): an invitation or rejection is only recorded. |
| 2026-11-19 | **Slice 6, hiring from Figma:** an event's Hiring tab (O14, `routes.eventHiring`); Find providers with search and filter pills (O17, `routes.hiring`, where the sidebar's Hiring link now goes); a provider's profile (O18); Send a booking request (O19) and Request sent (O77); a request's own page (O78), with Accept and Decline when the provider sent their own quote; Post a job (O20) and Job posted with Close early (O79); Compare quotes (O21), with "Create 2 bookings?" (O89) opened by `?dialog=accept&pick=…`. Hiring pages work for one event at a time: `?event=`, or else the next event that can still take bookings (`hiringEvent` in `lib/hiring.ts`). A third stand-in store (`lib/data/hiring-store.ts`) keeps booking requests and job posts in `next dev`, so sending, accepting and declining quotes, posting and closing jobs, and creating bookings from quotes all save and update the event's booking counts. The overview's hiring tiles now come from the same records, and the search page's providers come from the same samples, so an organiser can open a profile from a search result. |
| | **Rules the pages follow, not drawn in Figma:** a booking request's payments have to add up to its budget; a job post's quotes have to close before the event starts; "Booking requests" on O14 lists requests still waiting and ones answered in the last week; quotes over the job's budget are left out of O21 with a line naming them; O21 sorts by price, as its "Sort: price" pill says, so the cards aren't in Figma's order. The shared table, section and dialog-form styles moved from `Stalls.module.css` to `components/portal/tables.module.css`. **Left for later slices:** Message buttons (Messages), Open booking (Bookings, O22), See leaderboards and All (Leaderboards), Attach brief (needs storage), Edit post, and the review filters ("Could" in Figma). |
| 2026-11-19 | **Slices 7–13, the rest of the organiser from Figma** (asked for as "finish organiser e2e"; the venue map and the auth screens left out on purpose). Each part keeps its records in a dev-only store like the event store (in `next dev` memory, empty in production, replaced by Amplify Data in Phase B): `payment-store`, `feed-store`, `profile-store`, `verification-store`, `reviews-store`, `people-store` and `account-store` in `lib/data/`. Pages read and write only through `lib/data/portal.ts`. |
| | **Bookings (O22, O83–O88):** a booking is an accepted booking request, at `routes.booking`. Its payments come from the receipts (`lib/bookings.ts`): the next open one is due and later ones are upcoming, as O22 shows. Change terms (O83) sends new terms that wait for the provider. Cancel (O84) refunds what was paid, except a deposit within 7 days of the event. Report a problem (O87) goes to an admin, and Mark completed (O88) goes straight on to the review. A booking the provider cancelled shows O85, with "Reopen as a job post" (O86) prefilling the job form. |
| | **Payments (O60–O65), PayHere sandbox only:** the account (O61), paying one instalment (O62) with a receipt (O63, O64) and 5% commission shown but not charged, and the declined-card path (O65). Card details are checked for shape and dropped; only the last four digits reach the receipt. The merchant secret is checked and never stored. "Download PDF" prints the receipt. |
| | **Feed and analytics (O26, O99, O94, O50):** posting an image or reel previews the file in the browser and sends only its name, type and size, as there's no storage yet (EN-03); the 60-second and 100 MB limits are checked. Comments can be replied to and hidden. Analytics counts posts and Going from the records; page views, sources and follower weeks are samples, and Going-over-time climbs to the real count. |
| | **Profile (O27, O45, O42, O43, O44):** the profile, its past events and track record, an edit form (a short link can change once in 30 days; a new name keeps the badge while an admin checks it), followers with search, and a share dialog (WhatsApp and Facebook share pages; story image and QR code later). |
| | **Verification (O28, O38–O41):** one page for each state. The Verified badge comes from verification, so the profile and the gates always agree. Requests, job posts and stall slots need it: their pages show O41 and their actions refuse. In `next dev`, "Admin approves / rejects" (as Figma draws them) and "Start over" stand in for the admin. O100–O103 are sign-up setup steps (EN-04) and were left out. |
| | **Reviews and leaderboards (O29, O49, O46, O47, O30, O48, O31):** reviews from providers and consumers with one reply each and a report, writing a review with four scores (drafts kept), and the leaderboards with the organiser's own row marked. |
| | **People (O23, O90–O92, O24, O25, O93):** messages with attach (name only), block and report; every "Message" button that names a provider now opens or starts that conversation (`?to=`). Community: the event board and communities, threads with replies and upvotes, join and leave, and New thread for a board or a community. The event board (O16) now reads the same thread records. |
| | **Account (O32, O95–O98):** notifications save as they're switched, email or phone changes in two steps (in `next dev` any 6-digit code works), password rules match sign-up, blocked users can be unblocked, and Log out signs out of Amplify. Email and password are EN-04's: these record the change and keep no password. Language and theme record the choice; only English and light exist. |
| | **Fixes along the way:** timestamps are sorted as dates (`newestFirst`, `oldestFirst` in `lib/format.ts`), because samples are written "+05:30" and new records "Z" and text order mixed them up. The sidebar's Payments link had been put on the vendor menu by mistake and moved to the organiser's. The sidebar, top bar and profile menu link the organiser's new pages; other roles keep "coming soon". |
