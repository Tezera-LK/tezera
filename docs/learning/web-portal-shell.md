# Web portal shell: learning notes and decision record

> **Ticket:** [EN-06] Web portal shell, 10 points, in epic EP-00 Foundations (Jira space TES)
> 1. EN-06-T1 (5 pts): Next.js App Router with role-based layouts
> 2. EN-06-T2 (2 pts): Typed Amplify Data client; loading, error and empty-state components
> 3. EN-06-T3 (3 pts): Public, server-rendered routes for event and profile pages, read through guest access rules
>
> **Done when** (from the backlog): "Next.js portal with layouts for consumers, organisers, providers and admins" and "Event and profile pages render on the server and open without logging in". **Depends on:** EN-04 (authentication and role-based access).
>
> **Branch:** `feature/webportalshell` · **Started:** 2026-11-03 · **Status (18 Nov):** Phase A (no backend needed) built 3 Nov and redrawn after the wireframes 4 Nov (Decision 7). On 18 Nov, after `dev` brought in Danella's Cognito log in, Navindu approved five recommendations and they're built: real sign-in on the server (Decision 1c, EN-04-T4), teaser-only public pages (Decision 4, *Changed*), a `/freelancer` area of its own (Decision 1, *Changed*), log in landing on `/dashboard` (new Decision 8) and a typed data layer over sample data until the backend has data (Decision 2). Checks: [18 Nov](#checks-18-nov). Still waiting: real data (EN-03) and a test with a real user pool. See [Build order](#build-order).
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
| 1 | How does each role get its own area? | One signed-in shell, `(portal)`, whose navigation and colours follow the user's role. Pages every role uses (dashboard, feed, messages, settings…) exist **once**. Role-only tools sit in gated folders: `/organiser`, `/vendor`, `/freelancer` and `/admin`. *Revised: was one folder per role; `/provider` → `/vendor` on 3 Nov; freelancers moved from `/vendor` to `/freelancer` on 18 Nov, to match their log-in screen `/freelancer/login`.* |
| 2 | Where does a user's role come from? | **Cognito groups**: `attendee`, `organiser`, `vendor`, `freelancer`, `admin` (lowercase, as EN-04 created them in `amplify/auth/resource.ts`), read from the access token. **Exactly one per account**, added at sign-up by a small trigger. One exception: **admin wins**, because admins are added to `admin` by hand on top of the group they signed up with. *Revised: `ATTENDEE` → `CONSUMER` to match the backlog; then, on 18 Nov, to the lowercase names EN-04 actually built, with `attendee` instead of `CONSUMER`; "admin wins" added 18 Nov.* |
| 3 | Where is the role checked? | Three layers: `proxy.ts` (are you signed in? It protects every page except the public ones), a server-only `requireRole()` helper (do you have this role?), and backend auth rules (the real lock). The first two are EN-04-T4. **Built 18 Nov:** both read Danella's Cognito tokens from cookies (`ssr: true`), check their signature and refresh them when they expire. |
| 4 | How do we read data with types? | Amplify Gen 2 `generateClient<Schema>()`. Types come straight from `amplify/data/resource.ts`, with no code generation. Three clients: browser, server-as-user, server-as-guest. |
| 5 | Loading, error and empty states? | Next.js special files (`loading.tsx`, `error.tsx`, `not-found.tsx`) plus three small components: `<LoadingState>`, `<ErrorState>`, `<EmptyState>`. Their text comes in as props, so it can move into translation files. |
| 6 | Public event and profile pages? | **Teasers** (decided 18 Nov): `/events/<id>`, `/organisers/<id>`, `/vendors/<id>` and `/freelancers/<id>` show just enough to recognise the event or profile, then "See more on Tezera" with Log in and Create an account. Server-rendered and cached for 60 seconds (`dynamic = 'force-static'` + `revalidate = 60`), with Open Graph tags for WhatsApp previews. Drafts and attendee profiles are never public. *Revised: was `/profiles/<id>`, then `/providers/<id>`; full public pages → teasers on 18 Nov.* |
| 7 | Use Next's new Cache Components (`'use cache'`)? | **Not yet.** It works (we tested it), but it switches caching rules for the whole app, and Amplify Hosting does not officially support Next 16 yet. Revisit before Next 17. |
| 8 | How do we build before the backend exists? (Decision 6) | Pages only call a few small functions (`getSession()`, `getPublicEvent()`…) and build links through one `routes` file. The data functions return sample data in `next dev` and nothing in production builds. *New, 3 Nov. Changed 18 Nov: `getSession()` is real now; the "View as" box only appears in `next dev` without a user pool (CI's placeholder `amplify_outputs.json`).* |
| 9 | What should the shell look like? (Decision 7) | The layout both portal wireframes share: a top bar (logo, search, messages, notifications, role, profile), the sidebar as a rounded card in the role's colour, buttons beside each page title and an optional right-hand column of panels. Where the two wireframes disagree, each choice is written down. Text on the role colour is picked per palette, because white fails the contrast check on vendor green and consumer coral. *New, 4 Nov.* |
| 10 | How do the log-in screens and the portal fit together? (Decision 8) | Log in, setup and verification all end on `/dashboard`; Danella's stand-in `/<role>/home` page redirects there. The avatar opens an account menu: who's logged in, the set-up and verification screens, and **Log out**. Signed-out visitors to `/vendor`, `/organiser` or `/freelancer` go to that role's log-in screen. *New, 18 Nov.* |

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

**Status:** Accepted (3 Nov). Built with a stand-in session (Decision 6) on 3 Nov; the real Cognito session since 18 Nov (1c). *Changed 18 Nov:* freelancers have their own `/freelancer` area (see Naming below).

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

What's built, as of 18 Nov (the 3 Nov tree is in git history). Folders from other tickets are only touched where noted:

```text
apps/web/src/
├── proxy.ts                          18 Nov: signed-in check on every non-public URL + token refresh  (EN-04-T4)
├── lib/
│   ├── roles.ts                      EN-04 the four sign-up roles and their auth-screen wording (Danella)
│   ├── session.ts                    EN-04 Danella's browser-side helpers; 18 Nov: pathAfterLogin → /dashboard
│   ├── portal-roles.ts               portal roles = roles.ts + admin (= Cognito group names), labels, palettes
│   ├── routes.ts                     every URL in one place (Decision 6); 18 Nov: /freelancer, auth screens
│   ├── format.ts                     dates in Sri Lanka time, "A, B and C" lists
│   ├── amplify/server.ts             18 Nov: Amplify's server runner (adapter-nextjs); is there a real user pool?
│   ├── auth/cognito.ts               18 Nov: tokens → { userId, role, name }; "admin wins"; VIEW_AS
│   ├── auth/paths.ts                 18 Nov: which URLs are public; which log-in screen a visitor gets
│   ├── auth/session.ts               getSession() (real since 18 Nov), requireSession(), requireRole()
│   ├── auth/dev-role.ts              the development-only "View as" cookie (only without a user pool)
│   └── data/                         types.ts (teasers since 18 Nov), samples.ts, public.ts
├── components/
│   ├── ConfigureAmplify.tsx          EN-04 Danella's; 18 Nov: { ssr: true }
│   ├── auth/LoginForm.tsx            EN-04 Danella's; 18 Nov: "Keep me logged in" uses cookies (Decision 2)
│   ├── Palette.module.css            role palette → --t/--b/--p/--s/--a
│   ├── states/                       LoadingState, ErrorState, EmptyState (+ text.ts)
│   ├── portal/                       PortalShell, PortalNav, nav.ts, PageHeader, DevRoleSwitcher; 4 Nov: TopBar,
│   │                                       Columns, Panel, ButtonLink, icons (Decision 7); 18 Nov: AccountMenu
│   └── public/                       shared styles and words; 18 Nov: SignInPrompt, HeaderAction,
│                                           ProviderTeaser, metadata.ts, useHasSession (ContactDetails removed)
└── app/
    ├── layout.tsx                         root (unchanged)
    ├── global-error.tsx                   last-resort error page
    ├── not-found.tsx                      "Page not found" for unknown URLs
    ├── (marketing)/ …                     landing page (unchanged)
    ├── (auth)/ …                          log-in screens (Danella's). 18 Nov: [role]/home redirects to /dashboard
    ├── (public)/                          teasers anyone can see; server-rendered and cached
    │   ├── layout.tsx · error.tsx         header with "Log in" / "Your dashboard"; no loading.tsx (Decision 3)
    │   ├── events/[eventId]/              page · not-found
    │   ├── organisers/[organiserId]/      page · not-found
    │   ├── vendors/[vendorId]/            page · not-found
    │   └── freelancers/[freelancerId]/    page · not-found   (18 Nov)
    └── (portal)/                          signed-in area
        ├── layout.tsx · error.tsx         the shell: reads the role → that role's top bar, sidebar + palette
        ├── dashboard/                     page · loading; one URL for everyone, shows your role's dashboard
        │                                  (shared pages come later from their own tickets: feed, messages,
        │                                   community, notifications, leaderboards, reviews, profile,
        │                                   settings; the sidebar shows them as dashed "coming soon" pills)
        ├── organiser/                     layout + page call requireRole('organiser') · loading
        ├── vendor/                        layout + page call requireRole('vendor') · loading
        ├── freelancer/                    layout + page call requireRole('freelancer') · loading   (18 Nov)
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

**Changed 18 Nov: freelancers get `/freelancer` and `/freelancers/<id>`.** Danella's log-in screens, which `dev` brought in, live at `/<role>/login` for each sign-up role, `/freelancer/login` included. Two things followed:

- Sharing `/vendor` made freelancers log in at `/freelancer/login` and then work under `/vendor`. One word per role, in both places, is simpler to explain.
- The portal's `/vendor` and `/organiser` pages had taken over Danella's `/vendor` → `/vendor/login` redirect (open question 20 on 18 Nov). Now `proxy.ts` sends a signed-out visitor at `/vendor`, `/organiser` or `/freelancer` to that role's log-in screen, so those addresses behave exactly as her redirect did for visitors, and as tools pages for signed-in users. `/attendee` has no tools, so her redirect still handles it.

| Option | Good | Bad |
| --- | --- | --- |
| Keep `/vendor` for both (3 Nov) | Nothing to change | The log-in address and the tools address disagree for freelancers |
| **`/freelancer` of its own (chosen)** | Matches `/freelancer/login`. The `/vendor` gate is simply "vendor" | The second rejection reason from 3 Nov comes back: each tools page exists twice. Acceptable for now: today each is one placeholder page, and shared parts can live in components |
| Move every tool under `/<role>/tools/…` | No clash with the log-in screens at all | Longer addresses, and a bigger rename |

The groups were always separate (`vendor`, `freelancer`), so only the folder, the gate (`requireRole('vendor')` and `requireRole('freelancer')`) and `routes.ts` changed. Freelancer profiles moved from `/vendors/<id>` to `/freelancers/<id>`. No real links existed yet, so no redirect was needed.

### 1b. Where the role comes from

| Option | Good | Bad |
| --- | --- | --- |
| **Cognito groups** | Inside the access token (`cognito:groups`), so there is no database lookup. The **same** groups drive Amplify Data rules (`allow.group('admin')`), so the UI and the API agree. | A small Lambda (a "post-confirmation trigger") has to add the user to a group. Changes show up when the token refreshes, which can take up to about an hour. |
| A custom attribute `custom:role` | Easy to set at sign-up. | Amplify Data rules cannot use it directly. If it is editable, users could edit it themselves and promote themselves. |
| A `role` field on a Profile record | Flexible. | Needs a database read on every request. Data rules cannot use it. |

**Decision: Cognito groups.** The backlog and the PRD already specify this (EN-04-T1, PRD section 8), so the real decision belongs to the backend. This ticket just reads the group.

- **Group names** (EN-04-T2): EN-04 created `attendee`, `organiser`, `vendor`, `freelancer` and `admin` (`amplify/auth/resource.ts`). Cognito group names are case-sensitive, so the portal uses exactly these words (`lib/portal-roles.ts`). Until 18 Nov this doc and the code used `ORGANISER`, `VENDOR`, `FREELANCER`, `CONSUMER` and `ADMIN`.
- **How a user gets one** (PG-01-T1, EN-04-T1): the role picked at sign-up is sent with the sign-up, for example as an attribute that can't be changed later. The post-confirmation trigger then adds the matching group. The trigger must only accept the self-service roles: attendee, organiser, vendor and freelancer. **admin is assigned by hand, never from user input.**
- **Exactly one group per account** (EN-04's "done when"). Our code still copes with zero groups (see `/dashboard` above). The session has one `role` field, not a list. Exactly one known group becomes that role, and zero or several become "no role". That's safer than letting a two-group account into both areas.
- **Except admin (added 18 Nov): admin wins.** Everyone signs up as one of the four public roles: the pre-sign-up trigger refuses anything else. So an admin is someone who signed up (say, as an attendee) and was then added to `admin` by hand in the AWS console, and their account carries **two** groups. Under "several means no role", every admin would see "Finish setting up your account". Letting `admin` win is safe because only people with AWS console access can add anyone to that group. The rule lives in `roleFromGroups()` in `lib/auth/cognito.ts`, with a comment saying why.

> **Nobody can pick a role in the UI yet.** `globals.css` has styles for an account-type screen, but no page renders it, and the backlog puts the web role-choice page in PG-01-T4. Agree the hand-off with whoever builds it (probably Danella, on `feature/auth`).

### 1c. Where the role is checked (defence in depth)

> **Backlog note:** layers 1 and 2 below are EN-04-T4 ("protected routes and admin-only routes", TES-337, unassigned). EN-06 depends on EN-04. **Built in this branch on 18 Nov**, with Navindu's go-ahead, on top of Danella's Cognito log in from `dev`. Tell Danella, and assign TES-337 in Jira (the connector here is read-only).

The Next.js authentication guide is clear that **layouts are not a security boundary**:

> "Due to Partial Rendering, be cautious when doing checks in Layouts as these don't re-render on navigation … A layout also does not control whether the rest of the route renders … a layout that hides or swaps them does not stop them from running or from appearing in the RSC Payload."

So there are three layers, each with one job:

| Layer | Question it answers | Why it is there |
| --- | --- | --- |
| 1. `src/proxy.ts`, running on **every URL except the public ones** (listed in `lib/auth/paths.ts`: the landing page, `/privacy` and `/terms`, Danella's log-in, sign-up, verify and reset screens, the teasers; the matcher also skips `/api`, which goes to the NestJS app, and static files) | Is anyone signed in? If not, go to a log-in screen: the role's own one for `/vendor/…` and the like, otherwise `/login` | A fast bounce before any rendering. **It also refreshes expired tokens and saves them as cookies.** Server Components cannot write cookies; we read the Amplify adapter's source, and it silently ignores writes there. Shared pages (`/messages`, `/settings`…) will keep being added at the top level, so the proxy protects everything by default and lists only the public paths. A page someone forgets to list stays protected instead of open. Public paths return straight away, without reading cookies, so they stay cacheable (confirmed 18 Nov: second visit is a cache `HIT`). |
| 2. `requireRole('organiser')` in `lib/auth/` (server-only, wrapped in React `cache()`) | Does this user have the role? If not, send them to `/dashboard` | Called in each tools folder's `layout.tsx` **and** in every page or data loader inside it. Next treats that page-level call as the real check. Shared pages call `requireSession()` instead (signed in, any role). Thanks to `cache()`, calling these many times in one request costs one lookup. |
| 3. Amplify Data authorisation rules | May this identity read or write this record? | The real lock. If a UI check is ever missed, the API still refuses. |

**Wrong role → `redirect('/dashboard')`, not `forbidden()`.** `forbidden()` returns a proper 403 page, but it is still **experimental** in Next 16.4 (it needs `experimental.authInterrupts`). We avoid experimental flags in a shared team codebase and can revisit once it is stable.

`requireSession()` and `requireRole()` (`lib/auth/session.ts`) were built on 3 Nov, and every portal layout and page calls them. Until 18 Nov `getSession()` was a stand-in (Decision 6). Its body is now real, and nothing that calls it changed: the seam worked.

#### How the real sign-in check works (built 18 Nov)

1. **The browser keeps the login in cookies.** Danella's `ConfigureAmplify.tsx` now calls `Amplify.configure(outputs, { ssr: true })`. Without `ssr: true`, Amplify keeps the tokens in localStorage, which never reaches the server. With it, they're cookies, sent with every request. One more line had to change: her `LoginForm.tsx` swapped Amplify's storage for "Keep me logged in" (localStorage or sessionStorage), which would have hidden the login from the server again. It now picks between two cookie stores (Decision 2).
2. **`lib/amplify/server.ts`** creates Amplify's server runner (`createServerRunner` from `@aws-amplify/adapter-nextjs` 1.8.1, which supports Next `<17`).
3. **`readSession()` in `lib/auth/cognito.ts`** runs inside that runner. It asks for the tokens, which Amplify checks against the user pool's public keys (forged or edited tokens fail) and refreshes if they've expired. Then it returns `{ userId, role, name }`: the role from the access token's groups ("admin wins", 1b), the name from the ID token's email or phone.
4. **`proxy.ts`** calls it with the request and response, so a refresh can write new cookies. Next.js hands cookies set in the proxy on to the page rendered for the same request (checked in Next's source, `mergeMiddlewareCookies`, and by test: one refresh per request, not two). If nobody is signed in, it redirects, and copies over any cookies Amplify cleared (for example a revoked refresh token), so the browser doesn't retry them on every page.
5. **`getSession()`** calls it with Next's `cookies()`, wrapped in React `cache()`.

**Tokens only, not the whole session.** The 3 Nov sketch used `fetchAuthSession()`. Reading Amplify's source showed that it also asks the Cognito **identity pool** for AWS credentials on every call, and the server creates a fresh Amplify context for every request, so nothing would be remembered between pages.

| Option | Good | Bad |
| --- | --- | --- |
| `fetchAuthSession(ctx)` (the docs' example) | The documented pattern | One or two extra calls to Cognito Identity per request, in the proxy *and* the page. For signed-out visitors it would fetch **guest** credentials just to redirect them, so bots hitting `/dashboard` could use up Cognito's request quota. A failing identity-pool call would log out someone whose tokens are fine |
| **`ctx.getTokens({ forceRefresh: false })` (chosen)** | Tokens only: signature check and refresh, no identity pool. It's on the public `AmplifyContext` type, and it's what Amplify's own server `getCurrentUser()` calls | Slightly less obvious than the docs' example, so the code comment says why |
| `getCurrentUser(ctx)` | Documented, tokens only | Returns no groups, so the role would need a second read |

**Where a signed-out visitor goes.** The sketch sent everyone to `/login?next=…`. Danella's `/login` sends everyone to `/attendee/login`, and her form doesn't read `?next=` yet. So `logInPathFor()` sends `/vendor/…` to `/vendor/login`, `/organiser/…` to `/organiser/login` and so on, and everything else to `/login`. After logging in, everyone lands on `/dashboard` (Decision 8). Coming back to the page they asked for is open question 23.

**"View as" without a user pool.** `VIEW_AS` is true only in `next dev` with CI's placeholder `amplify_outputs.json` (client ID `placeholder`), where nobody can sign in. Then the proxy lets every page through and `getSession()` reads the "View as" cookie, as it always did. With a real `amplify_outputs.json`, or in any production build, it's false (Decision 6).

What's built, for reference:

```ts
// src/proxy.ts (shortened)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (VIEW_AS || isPublicPath(pathname)) return NextResponse.next();

  const response = NextResponse.next();
  const session = await runWithAmplifyServerContext({
    nextServerContext: { request, response }, // lets Amplify write refreshed tokens back as cookies
    operation: readSession,
  });
  if (session) return response;

  const logIn = NextResponse.redirect(new URL(logInPathFor(pathname), request.url));
  for (const cookie of response.cookies.getAll()) logIn.cookies.set(cookie); // keep Amplify's cookie changes
  return logIn;
}

// lib/auth/cognito.ts (shortened)
export async function readSession(ctx: AmplifyContext): Promise<Session | null> {
  let tokens;
  try {
    tokens = await ctx.getTokens({ forceRefresh: false }); // checks the signature; refreshes if expired
  } catch {
    return null; // couldn't refresh (revoked, user deleted, Cognito unreachable): signed out
  }
  if (!tokens) return null;

  const access = tokens.accessToken.payload;
  const id = tokens.idToken?.payload;
  return {
    userId: String(access.sub),
    role: roleFromGroups(access["cognito:groups"]),
    name: typeof id?.email === "string" ? id.email : typeof id?.phone_number === "string" ? id.phone_number : "",
  };
}

// app/(portal)/vendor/layout.tsx: the gate for vendor tools
export default async function VendorToolsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("vendor");
  return <>{children}</>;
}
```

---

## Decision 2: Typed Amplify Data client

**Status:** Proposed, partly built. On 18 Nov the Amplify plumbing that sign-in needed was built: `{ ssr: true }` in the browser and the server runner (Decision 1c). The data clients themselves still wait. `dev` has no Amplify Data (`amplify/backend.ts` only has auth), and the NestJS API only answers `/` and `/health`, so there's nothing to read yet. Whether data comes from Amplify Data (PRD, Jira) or the NestJS API is open question 9; ask Damian. Until then, T2's "typed data" is the typed functions in `lib/data/public.ts` over sample data (approved 18 Nov). Option A below is still the plan if the answer is Amplify.

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

Files (BUILT = in the branch, LATER = once there's a data backend):

```text
apps/web/src/
├── components/ConfigureAmplify.tsx   Danella's (EN-04); 18 Nov: Amplify.configure(outputs, { ssr: true })
└── lib/
    ├── amplify/server.ts      BUILT 18 Nov: createServerRunner. LATER: the two server data clients
    ├── data/
    │   ├── types.ts           BUILT hand-written teaser types → LATER derived from the schema
    │   ├── samples.ts         BUILT sample records for `next dev` → LATER deleted
    │   ├── public.ts          BUILT getPublicEvent(), getPublicOrganiser(), getPublicProvider() → LATER guest reads
    │   └── result.ts          LATER unwrap(): { data, errors } → data, or throws DataError
    └── auth/session.ts        BUILT requireSession(), requireRole(); getSession() real since 18 Nov
```

Two small departures from the 3 Nov plan:
- **No `outputs.ts`.** `amplify_outputs.json` is imported in two places: Danella's `ConfigureAmplify.tsx` (already there) and `lib/amplify/server.ts`. Moving her import into a new file for the sake of one line wasn't worth touching her file again.
- **`server.ts` has no `"server-only"` import**, because `proxy.ts` uses it and proxy code can't load that package. Nothing in it is secret: the browser bundle carries the same config.

The `Schema` type comes from the backend's `amplify/data/resource.ts` (EN-03). Until that file exists, the functions in `public.ts` use the hand-written types in `types.ts` and return sample data in `next dev`. Pages only call the functions, so they won't change when the insides do. See [Decision 6](#decision-6-building-before-the-backend-exists) and the [build order](#build-order).

`{ ssr: true }` tells the browser to keep tokens in **cookies** instead of localStorage, which is how the server finds out who is signed in. *Changed from the plan:* `ConfigureAmplify` isn't in the root layout. Danella mounts it in `(auth)/[role]/layout.tsx`, and the portal shell mounts it for Log out. The landing page and the teasers don't load Amplify at all.

**"Keep me logged in" (18 Nov).** Danella's log-in form chose between localStorage (ticked) and sessionStorage (unticked). Either would put the tokens back where the server can't see them, so both choices are now cookies:

| Ticked | Unticked |
| --- | --- |
| The same cookies `ssr: true` uses by default: kept for a year | Session cookies (no expiry date): the browser deletes them when it closes |

*Known gap:* when the server refreshes the tokens (after an hour), Amplify writes the new cookies with its default one-year lifetime, and so does the browser after a page reload. So "unticked" only holds until the first refresh. Making the choice stick needs a small follow-up (open question 22). It was already weaker before: with sessionStorage, reloading the page lost the login completely.

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

**Status:** *Changed 18 Nov: teaser only* (see [4d](#4d-changed-18-nov-teasers-instead-of-full-pages)). Routes, caching and page skeletons built 3 Nov; tested on a production build, where found pages came back `200` with the content in the HTML and the second visit was a cache `HIT`. Guest-access reads (4a) wait for the data backend (EN-03). 4a to 4c still apply; 4d changes what the pages show.

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
| **Organiser and provider profiles** | `allow.guest().to(['read'])` on the two models, with a **field-level rule** on anything private | These are business listings meant to be found (US-P01 "Be found by organisers I don't know"; organisers carry a Verified badge, US-C05). The organiser profile includes contact details (AC-02). **Decided 3 Nov: hidden from visitors who aren't logged in; anyone logged in, whatever their role, can see them.** The cached public page can't contain them, so it shows a "Log in to see how to contact this organiser" box (`components/public/ContactDetails.tsx`). In Phase B that box loads the details in the browser for a logged-in viewer. *(18 Nov: box removed with the teaser, 4d. Contact details now belong to the full profile page, for signed-in users only.)* Field-level rules **do not inherit** the model's rules (Amplify docs), so a locked field needs its own full list (owner, signed-in readers, admins). Our guest field lists leave such fields out, so guest reads never ask for them. |
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

### 4d. Changed 18 Nov: teasers instead of full pages

On 4 Nov Navindu leaned towards sign-in for everything, then asked how shared WhatsApp links would keep working. The key fact: a link preview is fetched by WhatsApp's server, signed out, so whatever a preview shows is public by definition. The options and the reasoning are in [public pages and the portal](web-portal-shell-public-vs-portal.md). On 18 Nov Navindu approved **B, teaser only**:

| Option | Verdict |
| --- | --- |
| A. Full public pages (built 3 Nov) | Replaced: more public than anyone wanted |
| **B. Teaser only** | **Chosen**: shared links and preview cards keep working, and only a few fields per page are public |
| C. Sign in for everything | Rejected: breaks US-C15 (a *Must*: "open a shared link") and EN-06's own "done when" |

What each teaser shows: an event's title, date and time, district, organiser's name and status (Postponed, Cancelled); an organiser's name, district and Verified; a vendor's or freelancer's name, category and Verified. Each ends with "See more on Tezera" and Log in / Create an account.

How it's enforced: the public types carry only those fields, and `lib/data/public.ts` copies them out by name, so a field added to the backend later can't leak by accident. A build with sample data confirmed no summary, venue or description appears anywhere in the HTML.

Also on 18 Nov:
- **Open Graph tags** (`og:title`, `og:description`, `og:site_name`) on every teaser, built from the teaser's own fields, so WhatsApp shows a sensible card. The preview image stays with US-C15-T4.
- **Logged-in visitors** see the same cached page, but their browser swaps "Log in" for "Your dashboard". It looks for Amplify's login cookie; that's a hint for the label, never a decision about access.
- **The contact-details box is gone**: contact details are simply not part of a teaser any more.
- Still open: where signed-in users see an event's full details (the full-page stories decide), and rewording EN-06-T3's "done when" in Jira.

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

**Status:** Accepted and built (3 Nov). *Changed 18 Nov:* `getSession()` is real (Decision 1c). The "View as" box stays, but only for `next dev` without a user pool (see below). The data functions are still stand-ins.

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
- **`getPublicEvent()`, `getPublicOrganiser()` and `getPublicVendor()`** (`getPublicProvider()` since 18 Nov; `lib/data/public.ts`) return records from `lib/data/samples.ts` in `next dev`, and nothing (so "not found") in production builds. The samples include a draft, `/events/evt-sample-draft`, to show that drafts never come back.
- **`lib/routes.ts`** builds every URL, so renaming a URL word means changing one file plus the folder names.
- The `NODE_ENV` checks are fixed when the app is built: `next build` sets `production`, so the development-only branches are dead code there.

**Try it:** run `pnpm dev:web`, open `/dashboard` and change the "View as" box. Public pages:
- `/events/evt-sample-1`
- `/events/evt-sample-2` (postponed)
- `/organisers/org-sample-1`
- `/vendors/ven-sample-1` (a vendor)
- `/freelancers/fre-sample-1` (a freelancer; it was `/vendors/ven-sample-2` until 18 Nov)

**Phase B** deletes `samples.ts`, `dev-role.ts` and `DevRoleSwitcher.tsx`, and fills in the real `getSession()` and data reads.

#### 18 Nov: "View as" only where nobody can sign in

The 3 Nov plan deleted the "View as" box once real sign-in arrived. On 18 Nov real sign-in arrived, but the 3 Nov reason for the box still holds on any machine without its own Amplify backend: with CI's placeholder `amplify_outputs.json` there is no user pool, so the log-in screens can't work and the portal would be unreachable.

| Option | Good | Bad |
| --- | --- | --- |
| Delete "View as" now (the 3 Nov plan) | No dev-only code left | Nobody can see the portal locally until they've set up AWS and a sandbox |
| Keep it in every `next dev` | Easy demos | With a real sandbox, logging out would still show a portal: testing real sign-in in dev would be confusing |
| **Keep it only when there's no user pool (chosen)** | Works out of the box with the placeholder; switches itself off once `pnpm sandbox` writes a real `amplify_outputs.json` | One more condition to understand: `VIEW_AS` in `lib/auth/cognito.ts` |

`VIEW_AS = NODE_ENV === "development" && no user pool`, where "no user pool" means the client ID is CI's `placeholder` (or missing). Production builds never have it, whatever the config. When `VIEW_AS` is on, `proxy.ts` lets every page through and `getSession()` reads the "View as" cookie, exactly as before 18 Nov. `dev-role.ts` and `DevRoleSwitcher.tsx` can go once every developer has a sandbox.

## Decision 7: Following the wireframes

**Status:** *Proposed*, built 4 Nov. Navindu asked for the shell to follow the two portal wireframes in the ATP repo. The choices below where the two disagree are Claude's and are waiting for review.

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

## Decision 8: Joining the log-in screens to the portal

**Status:** Accepted and built (18 Nov). Navindu approved landing on `/dashboard`; the rest follows from it.

### The problem

`dev` brought in Danella's log-in flow (EN-04): `/<role>/signup` → `/<role>/verify` → `/<role>/setup` → `/<role>/verification`, ending on her stand-in home page `/<role>/home`. That page says who is logged in, links back to setup and verification, and has Log out; its own comment says to replace it "when the real home pages are built". The portal is that home. Four questions follow: where do people land, what happens to `/<role>/home` and its links, how do you log out of the portal, and what does a signed-out visitor at `/vendor` see now that the portal owns that address?

### 8a. Where log in lands

| Option | Good | Bad |
| --- | --- | --- |
| `/<role>/home` (as built) | No change | A placeholder that says "Your home page comes next" |
| **`/dashboard` (chosen)** | The portal's one "after sign-in" address (Decision 1); one line in `pathAfterLogin` | Touches Danella's files |
| The role's tools page (`/vendor` and so on) | Straight to the tools | Attendees have none, and the dashboard is the overview in both wireframes |

People who haven't finished setting up still go to `/<role>/setup` or `/<role>/verification`, as before. "Skip for now" and "Continue" at the end of her three setup forms and the verification form now go to `/dashboard` too, through `routes.dashboard`.

### 8b. `/<role>/home` and its links

- **Kept as an old address** that redirects to `/dashboard`, the way Danella's `/login` redirects to `/attendee/login`. `HomePanel.tsx` is removed: only that page used it.
- **Its two links moved into the account menu** (8c): "Edit your profile" ("Edit your feed" for attendees) → `/<role>/setup`, and "Verification" → `/<role>/verification` for organisers, vendors and freelancers. The vendor and freelancer sidebars' "Verification" items link there as well (open question 13 still asks whether one place suits every role).

### 8c. The account menu and Log out

The wireframes' avatar opens the profile, which no ticket has built yet. Until it exists, the avatar opens a small panel: the email or phone number they log in with, their role, the links from 8b, and **Log out**.

| Option | Good | Bad |
| --- | --- | --- |
| **A disclosure: a button that shows and hides a panel (chosen)** | Plain links and a button, so Tab works as usual. Escape (focus returns to the avatar) or a click elsewhere closes it | Focus isn't trapped: tabbing past the last item leaves the panel open behind you until Escape or a click |
| An ARIA menu (`role="menu"`, arrow keys) | Feels like a desktop menu | More code, and easy to get subtly wrong for screen readers |
| A separate "Log out" button in the top bar | Always visible | No room on phones, where the role chip is already hidden |

Log out calls Amplify's `signOut()`, which deletes the login cookies and tells Cognito to revoke the refresh token. Then it does a full page load to the role's log-in screen, so nothing from the portal stays in memory, and `replace()` keeps the portal out of the Back button. If `signOut()` fails, the menu says so instead of pretending: on a shared computer, believing you've logged out when you haven't is the worse mistake. Amplify has to be set up in the browser for this, so `PortalShell` renders Danella's `<ConfigureAmplify />`.

### 8d. A signed-out visitor at `/vendor`

Before 18 Nov, the portal's `/vendor` and `/organiser` pages took over Danella's `/vendor` → `/vendor/login` redirect. Now `proxy.ts` sends a signed-out visitor at `/vendor`, `/organiser` or `/freelancer` to that role's log-in screen (1c), the same place her redirect did.

### Files touched outside the shell (for Danella's review)

| File | Change |
| --- | --- |
| `components/ConfigureAmplify.tsx` | `{ ssr: true }`, so the server can see the login |
| `components/auth/LoginForm.tsx` | "Keep me logged in" picks between two cookie stores instead of localStorage and sessionStorage (Decision 2) |
| `lib/session.ts` | `pathAfterLogin`: "done" → `/dashboard` |
| `components/auth/setup/AttendeeSetupForm.tsx`, `OrganiserSetupForm.tsx`, `ProviderSetupForm.tsx`; `components/auth/VerificationForm.tsx` | Finish on `/dashboard` |
| `app/(auth)/[role]/home/page.tsx` | Now redirects to `/dashboard` |
| `components/auth/HomePanel.tsx` | Removed |
| `components/auth/RequireUser.tsx` | One comment |

### Gotchas

- **`ssr: true` alone wasn't enough.** The log-in form swapped Amplify's storage for "Keep me logged in", which would have put the tokens back in localStorage and left the server blind.
- **Amplify re-applies its default storage on every `Amplify.configure()`**, which means on every page load. That's why "unticked" can't fully stick yet (Decision 2).
- **The cookies are `Secure` by default.** Browsers accept that on `http://localhost`, so local log in works without HTTPS (checked in Edge on 18 Nov).
- **Everyone is logged out once** when this reaches a deployed site: the tokens move from localStorage to cookies.
- **There's no admin log-in screen.** An admin logs in on the screen of the role they signed up with; "admin wins" then takes them to the admin portal (open question 24).

---

## Not part of this ticket

The backlog gives the neighbouring work to other tickets. This branch uses their results but doesn't build them:

- **The backend:** environments (EN-02), the data models (EN-03), Cognito groups and auth rules (EN-04-T1, T2), and the event-page query (US-C03-T1).
- **Sign-in and sign-up pages**, including the role choice (PG-01-T4; Danella built them, and they're on `dev`).
- ~~**The real sign-in check** (`proxy.ts` and the real `getSession()`) is EN-04-T4.~~ *Built in this branch on 18 Nov* (Decision 1c, open question 7).
- **The real page designs:** the event page (US-C03-T3), the vendor and freelancer profile (US-P01-T3), the organiser profile (US-P04-T3) and the attendee profile (PG-02-T3). This ticket ships the routes with teasers.
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

5. **Amplify wiring:** *partly done 18 Nov*: `ssr: true` and the server runner. Still to come with a data backend: the data clients and `unwrap()`, and `Schema`-based types instead of the hand-written ones.
6. **Real sign-in:** *done 18 Nov* (Decision 1c), in this branch as EN-04-T4. Plus Decision 8: log in lands on `/dashboard`, account menu, Log out. "View as" stays only where there's no user pool (Decision 6).
7. **Real public reads:** guest reads in `lib/data/public.ts`, then delete the sample data. *Changed 18 Nov:* pages are teasers (4d), so there are no contact details to load.
8. **Check:** *done 18 Nov* for lint, type-check, production build, a sign-in test with Cognito-shaped tokens, and browser checks ([18 Nov checks](#checks-18-nov)). Still to do: a real sandbox (`pnpm sandbox`), then dev.tezera.lk after the merge (Next 16 on Amplify Hosting is untested).

**18 Nov, also built:** teasers (4d), `/freelancer` and `/freelancers/<id>` (Decision 1, Naming).

### Running it on Windows (3 Nov)

- `pnpm install`. If `pnpm` isn't found, use `corepack pnpm install`.
- `pnpm dev:web` works normally.
- `pnpm build` currently fails on Windows (the Turbopack font error under [Where we are starting from](#where-we-are-starting-from-2026-11-03)). Use `pnpm exec next build --webpack` inside `apps/web`. On `main` it also fails everywhere until the empty `(auth)` files are filled in by `feature/auth`. **18 Nov:** both fixed on `dev`. The font is now bundled locally and the `(auth)` files are filled in, so a plain `next build` (Turbopack) works on Windows.
- **18 Nov:** Next 16.4.2's `next build` and `next dev` sometimes stop after printing a security advisory ("Your version of Next.js is affected by a known security vulnerability"). Run the same command again and it carries on. The advisory is real: see open question 25.
- **18 Nov:** only one `next dev` can run per project. A second one stops with "Another next dev server is already running" and names the first one's process.
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
6. **URL words:** `/organiser/…`, `/vendor/…` and `/admin/…` for tools; `/events/<id>`, `/organisers/<id>` and `/vendors/<id>` for public pages (Decision 1). *Changed 18 Nov: freelancers got `/freelancer/…` and `/freelancers/<id>`.*

**Still open** (as of 4 Nov; answers added 18 Nov):

7. **EN-04-T4** (protected routes) has no assignee, but it sits under Danella's EN-04, so it's hers by default. `requireSession()` and `requireRole()` already exist in this branch. Agree with Danella who writes the real `getSession()` and `proxy.ts`. **Answered 18 Nov:** Navindu chose to build it in this branch (Decision 1c). Still to do: tell Danella, and assign TES-337 in Jira.
8. **Hand-off with Danella:**
   - after login, go to `/dashboard`, or to the page in `?next=` if there is one; **answered 18 Nov:** `/dashboard` (Decision 8). `?next=` is question 23.
   - how the sign-up form passes the chosen role to Cognito. **Answered by `dev`:** as `custom:role`, which can't be changed later; the post-confirmation trigger checks it and adds the group (never `admin`).

   PG-01-T4 (the sign-up and login pages) is unassigned, but `feature/auth` built them and they're on `dev`.
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

18. **How far should the public side go?** Full public pages (built), teaser only (proposed) or sign-in for everything. A link preview is fetched by a signed-out visitor, so whatever it shows is public. See [public pages and the portal](web-portal-shell-public-vs-portal.md). Decision 4 is unchanged until the team decides. **Answered 18 Nov: teaser only** (Decision 4d). Still to do: reword EN-06-T3's "done when" and US-P01's "public view" in Jira.
19. **Where do the brand colours live, and is there a dark mode?** PR #14 removed both from `globals.css`. The shell keeps its own copy of the colours for now, light only. EN-07 should give them one shared home. See [colour tokens after PR #14](web-portal-shell-colour-tokens.md).

**New on 18 Nov:**

20. **`/vendor` and `/organiser` vs Danella's `/<role>` redirect.** The portal's tools pages took over her `/vendor` → `/vendor/login` redirect. **Settled in code:** `proxy.ts` now sends signed-out visitors there to that role's log-in screen (Decision 8d). Confirm with Danella in the review.
21. **Danella's review.** Decision 8 lists every file of hers that changed. Ask her to look before the pull request is merged.
22. **"Keep me logged in", unticked,** only holds until the first token refresh (Decision 2). A follow-up could remember the choice in a cookie and apply it in `ConfigureAmplify` and `proxy.ts`. Low priority: before 18 Nov a page reload lost the login completely.
23. **Coming back to the page you asked for after logging in** (`?next=`). Danella's form doesn't read it, so everyone lands on `/dashboard`. Worth adding once the full event pages exist, so "See more on Tezera" can bring people back to the event.
24. **Admin log-in.** There's no admin log-in screen: `/admin/login` is a 404, and the four screens only accept their own role. An admin logs in on the screen of the role they signed up with; "admin wins" (1b) then gives them the admin portal. Fine for testing. Whether admins need their own entrance is for EN-04 and the admin stories.
25. **Next.js 16.4.2 has a known security advisory**, which `next build` and `next dev` print. 16.4.4 is out. Upgrading changes the whole app, so it belongs in its own small pull request, not this one. Ask Damian, who owns the build.
26. **dev.tezera.lk has no data to show.** Sample data only appears in `next dev`, so hosted teasers say "not found" and dashboards are empty. A "demo data" switch for dev.tezera.lk only (never www) was suggested on 18 Nov; not built, waiting for an answer.
27. **Test with a real user pool before the pull request.** Run `corepack pnpm sandbox --outputs-out-dir apps/web` (needs the `tezera` AWS profile), sign up one account per role, and add one of them to `admin` in the Cognito console. Then try log in, each tools gate, Log out, and "Keep me logged in".

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

### Checks (18 Nov)

In the repo, on top of `dev` (`e124948`), Next.js 16.4.2, Node 24.21.0, Windows 11. The check scripts were throwaway files outside the repo; the repo has no test framework yet (that's EN-16).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passes |
| `eslint` | 0 errors. One old warning in the landing page's `Roles.tsx`, not ours |
| `next build` (Turbopack, on Windows) | Passes: 40 pages, the proxy compiled, portal routes `ƒ` (per request), teasers `○` (static, cached). Next drops the auth screens' `/[role]` static paths for `/organiser`, `/vendor` and `/freelancer` in favour of the portal's pages, with no error |
| Logic checks (82) | Which URLs the proxy runs on (20, using Next's own matcher test), which are public (34), which log-in screen a visitor gets (9), groups → role (12), `readSession()` with a stand-in Amplify context (6), the two flags (2). All pass. This also proved the proxy's imports load without `"server-only"` |
| Sign-in, end to end (49) | A production server with a throwaway signing key (below). Visitors go to the right log-in screen. Public pages, the auth screens and `/api` are left alone. Each role passes only its own gates. **Refused:** a token signed with another key, an organiser's token edited to say `admin`, another app's token, garbage. **Expiry:** an expired token with a good refresh token is refreshed **once** in the proxy and the page uses the new cookie; a revoked refresh token leads to log in, and the redirect clears all 7 login cookies. All pass, on the final build too |
| Browser (23, headless Edge, screenshots) | The account menu shows the right name, role and links; Escape closes it and puts focus back on the avatar; a click elsewhere closes it. **Log out** (Amplify's real `signOut()`) clears every login cookie and lands on the role's log-in screen, and `/dashboard` then sends you to log in. Freelancer tools have no stalls. At 390px the menu stays on screen and nothing scrolls sideways. The public header says "Log in" or "Your dashboard". A `Secure` cookie written by JavaScript is kept on `http://localhost` |
| Teasers (24) | On a build with sample data switched on temporarily (then switched back, and the file checked byte for byte). 200s and 404s as expected (a draft is a 404; a vendor's ID under `/freelancers/` is a 404). No summary, venue or description anywhere in the HTML. `og:title`, `og:description` and `og:site_name` correct; postponed events say so first. The second visit is a cache `HIT` |
| `next dev` | Only the dev server another session had left running (started 20:52) could be used, because Next allows one `next dev` per project. On it, the "View as" dashboard and every tools gate behaved. Pages that build static paths returned 500, with "Jest worker encountered 2 child process exceptions" in its log, including the auth screens' `/[role]/login` (yet `/vendor/login` returned 200). The cause wasn't found. The same code's production builds ran the same static-path step without errors. **Rechecked the same evening, after that server was stopped:** a fresh `next dev` passed all 25 route checks (the 500s were gone; drafts and wrong-kind profile IDs give 404) and 8 browser checks of "View as", with nothing in its logs but the advisory. Next's dev badge ("1 Insight") is that same security advisory, with "No issues" |
| Not checked | A real user pool (no sandbox on this PC yet): real sign-up, codes and log in; dev.tezera.lk; Safari |

**How the sign-in test worked without AWS.** A throwaway RSA key played the part of Cognito's signing key. A small preload in the server process answered two requests, and only for CI's placeholder pool's addresses: the pool's public keys (`/.well-known/jwks.json`, which `aws-jwt-verify` downloads), and `GetTokensFromRefreshToken` (Amplify's refresh call). Tokens carried Cognito's claims (`iss`, `token_use`, `client_id` or `aud`, `exp`, `cognito:groups`) and sat in the cookies Amplify uses. So the real code ran end to end, signature checks and refreshes included, and nothing was sent to AWS.

## Versions checked (npm, 2026-11-03)

| Package | Latest | Notes |
| --- | --- | --- |
| `next` | 16.4.4 | The repo pins 16.4.2 |
| `aws-amplify` | 6.22.2 | |
| `@aws-amplify/adapter-nextjs` | 1.8.1 | Supports `next >=13.5.0 <17.0.0`. **Installed 18 Nov** (`^1.8.1`; it brings `aws-jwt-verify` 4.0.1) |
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
| 2026-11-18 | The two commits above were pushed to `origin/feature/webportalshell` the same evening, at Navindu's request. No pull request yet. |
| 2026-11-18 | **Phase B, part 1, built** after Navindu's go-ahead ("start building… finish it asap"), on `feature/webportalshell` only: nothing merged into `dev`. Five recommendations approved: teaser public pages, a `/freelancer` area, log in landing on `/dashboard`, real sign-in on the server, and typed data functions over sample data until there's data. Checks in [18 Nov](#checks-18-nov). |
| | **Decision 1c built** (EN-04-T4): `proxy.ts`, the real `getSession()`, and `readSession()` in `lib/auth/cognito.ts`, on `@aws-amplify/adapter-nextjs` 1.8.1. *Changed from the 3 Nov sketch:* `ctx.getTokens()` instead of `fetchAuthSession()`, because the latter also asks the identity pool for credentials on every request (including guest credentials for every signed-out visitor). And signed-out visitors go to their role's log-in screen, not `/login?next=…`, because Danella's form doesn't read `?next=` and her `/login` always means the attendee screen. |
| | **Decision 1 changed:** freelancers moved from `/vendor` to `/freelancer`, and their profiles from `/vendors/<id>` to `/freelancers/<id>`, to match `/freelancer/login`. The `/vendor` gate is vendors only. This also settles the clash with Danella's `/<role>` redirect (open question 20). |
| | **Decision 1b:** "admin wins". Admins sign up as one of the four roles and are added to `admin` by hand, so they carry two groups. |
| | **Decision 2, partly built:** `{ ssr: true }` in Danella's `ConfigureAmplify.tsx` and the server runner. Her log-in form's "Keep me logged in" now chooses between two cookie stores, because localStorage or sessionStorage would hide the login from the server. Known gap: "unticked" holds only until the first token refresh (question 22). The data clients wait for a data backend. |
| | **Decision 4 → Changed: teaser only** (4d, answering question 18). Types cut down to teaser fields, contact-details box removed, "See more on Tezera" box, Open Graph tags, and a browser-side "Your dashboard" hint for logged-in visitors. |
| | **Decision 6 changed:** the "View as" box stays, but only in `next dev` without a user pool (CI's placeholder `amplify_outputs.json`). With a real one, or in production, sign-in is real. |
| | **New Decision 8:** log in, setup and verification end on `/dashboard`; Danella's `/<role>/home` redirects there and `HomePanel.tsx` is gone; the avatar opens an account menu with her set-up links and Log out. Her files that changed are listed in Decision 8 for her review. |
