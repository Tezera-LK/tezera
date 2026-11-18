# Public pages and the portal: how far the public side goes

> **Companion to** [web-portal-shell.md](web-portal-shell.md) (the decision record) and [web-portal-shell-explained.md](web-portal-shell-explained.md) (the theory).
>
> **Written:** 2026-11-04 · **Status:** the teaser model in sections 3 and 4 is a **proposal**. The team hasn't decided yet, and nothing in the code has changed for it. What's built today is column A in section 3.

---

## 1. The question

Two goals pull against each other:

- **Shared links should work.** When someone posts an event on WhatsApp or Instagram, the link should open and show a preview card. That's how people find events (US-C15, a *Must* in the backlog).
- **Everything else needs the right account.** Organisers, vendors, freelancers, consumers and admins sign in, and each one only reaches their own tools.

So the question isn't "public or private?". It's **"where exactly is the line?"**

---

## 2. The key fact: a link preview is an anonymous visitor

When you paste a link into WhatsApp, WhatsApp's own server opens the page. It has no account and no cookies. It reads the page's title, description and picture (the **Open Graph tags**, which `generateMetadata()` produces) and builds the card from them.

```
You paste  tezera.lk/events/abc  into WhatsApp
        |
        v
WhatsApp's server opens the link, signed out
        |
        +-- page is public      -> card: "Colombo Street Food Night
        |                                 Sat 12 Dec, Galle Face Green"
        |
        +-- page needs sign-in  -> redirected to /login
                                   card: "tezera | Log in"
```

So **whatever a preview card shows is public**, by definition. A private page can't have a rich preview. Google works the same way: it only indexes what a signed-out visitor can see.

That turns the question into: **what's the least a stranger needs to see before they want to sign in?**

---

## 3. Three places to draw the line

| | A. Full public pages | B. Teaser only (recommended) | C. Sign in for everything |
| --- | --- | --- | --- |
| **What a visitor sees** | Event: title, summary, date, venue, organiser link. Organiser: bio, district, upcoming events. Vendor: bio, category, districts. Contact details locked. | A short card per link: title or name, date and city (events), category (vendors), verified badge, then **Sign in to see more**. | The landing page and the log-in and sign-up pages only. |
| **Preview cards** | Rich | Good enough: name, date, city, one-line summary | "tezera \| Log in" for every link |
| **Data made public** | Most event and profile fields | A few fields per page | None |
| **Fit with the backlog** | Matches EN-06-T3 and US-C15 as written | EN-06-T3's "done when" and US-P01's "public view" need rewording | Breaks US-C15 ("open a shared link") and US-C15-T4 (preview card) |
| **Status** | **Built now** (Phase A) | Proposed | Considered on 4 Nov, then reopened because of shared links |

**Recommendation: B, teaser only.** It keeps shared links and preview cards working, which is the backlog's main reason for having public pages, while everything useful needs an account. It also keeps the privacy story short: a handful of fields per page, all of them meant for strangers.

---

## 4. The two areas, drawn (teaser model)

```
                          ANYONE (no account)
+---------------------------------------------------------------+
| PUBLIC: read-only, one item at a time, only by exact link     |
|                                                               |
|  /                  landing page (Yevan)                      |
|  /login, sign-up    Danella, EN-04 (not merged yet)           |
|  /events/<id>       teaser: title, date, city, organiser name |
|  /organisers/<id>   teaser: name, district, verified badge    |
|  /vendors/<id>      teaser: name, category, verified badge    |
|                     each ends with  [ Sign in to see more ]   |
|                                                               |
|  NOT public: browsing or search, drafts, contact details,     |
|  consumer profiles, any button that does something            |
+-------------------------------+-------------------------------+
                                |
                                |  GATE 1: requireSession()
                                |  not signed in -> /login
                                v
+---------------------------------------------------------------+
| PORTAL: signed in only, hidden from Google                    |
|                                                               |
|  /dashboard and the shared pages: feed, messages, profile...  |
|  full event details, contact details, booking, reviews        |
|        |                                                      |
|        |  GATE 2: requireRole()    wrong role -> /dashboard   |
|        v                                                      |
|  /organiser/*  organiser      /vendor/*  vendor, freelancer   |
|  /admin/*      admin                                          |
+-------------------------------+-------------------------------+
                                |
                                |  LAYER 3 (Phase B): backend rules
                                |  on every read and write
                                v
                          DATABASE / API
```

---

## 5. Five rules that keep it strict

1. **Read-only.** A visitor can look but never act. Booking, messaging, reviewing, applying, following and buying all sit behind Gate 1.
2. **Only by exact link.** There's no public list, search or "browse all events" page. In the real backend, IDs are long random strings, so nobody can guess their way from one event to the next. (Today's sample IDs, like `evt-sample-1`, only exist for development.)
3. **Nothing personal.** Public pages are **cached**: built once and served to everyone as the same copy. So by design they can't contain anything about the person looking.
4. **Drafts and consumer profiles are never public.** A draft event shows "Event not found" even with the right link, and there is no public page for consumers at all.
5. **The role comes from the account.** Each account has exactly one role, set at sign-up (a Cognito group in Phase B). You can't pick a role when you log in: using organiser tools needs an organiser account. The "View as" box is a development-only stand-in and doesn't exist in production.

---

## 6. How strict is it today?

| Layer | Today (Phase A) | Phase B |
| --- | --- | --- |
| **Gate 1: signed in?** | Real code: `requireSession()` in the portal's layout. The identity behind it is a stand-in. In `next dev` you're always signed in as the "View as" role; in a production build nobody is, so every portal page sends you to `/login`. | The real Cognito session (EN-04) |
| **Gate 2: right role?** | Real code: `requireRole()` in each tools folder's layout and in every page inside it. | The same code, with real roles |
| **Layer 3: backend rules** | Doesn't exist yet: there's no backend. | Rules on every read and write. Guests only get public fields, and drafts never leave the database (EN-03, EN-04). |
| **Public data** | Sample data in `next dev`, nothing in production builds. | Read as a guest, through those rules |

The design is tight, but the lock that actually protects the data (layer 3) arrives with the backend. Until then nothing real can leak, because there is no real data.

---

## 7. If the team picks the teaser: what changes

It's a small change, about an hour:

- **`lib/data/types.ts`:** trim `PublicEvent`, `PublicOrganiser` and `PublicVendor` to the teaser fields. Then a page *can't* show more, because the data never reaches it.
- **The three public pages:** show only the teaser fields; drop the organiser's upcoming-events list and the link to the organiser; add a **Sign in to see more** button that comes back to the same page after logging in (`/login?next=…`, open question 8 in the decision record).
- **Full details for signed-in users:** to decide in Phase B, with EN-04. Either the same address adds the details in the browser once you're signed in (already the plan for the contact-details box), or signed-in users get a portal page for each event.
- **Jira:** reword EN-06-T3's "done when" and US-P01's "public view". US-C15 stays as it is.

---

## 8. Questions to settle

1. A, B or C? *(Recommendation: B.)*
2. If B, which fields go in each teaser? *(Proposal in section 3.)*
3. Teasers for profiles too, or for events only? *(Recommendation: profiles too. Vendors and freelancers share their profile link to win work, US-P01.)*
4. Where do signed-in users see an event's full details? *(Section 7.)*
5. Who rewords the Jira tickets? *(Navindu, once the team agrees.)*

---

## 9. Check yourself

<details>
<summary>1. Why can't a WhatsApp preview show a page that needs sign-in?</summary>

WhatsApp's server opens the link without an account, so it gets sent to the login page. A preview can only show what a signed-out visitor sees.
</details>

<details>
<summary>2. A stranger guesses the address of a draft event. What stops them?</summary>

Today, `getPublicEvent()` never returns drafts, so the page says "Event not found". In Phase B the backend's rules also refuse to send drafts to guests, and real IDs are random, so guessing addresses doesn't work anyway.
</details>

<details>
<summary>3. In <code>next dev</code> today, can you show a signed-out visitor being turned away from the portal?</summary>

No. The stand-in always signs you in as the "View as" role. In a production build nobody is signed in, so every portal page redirects to `/login`.
</details>

<details>
<summary>4. Why can't a public page greet the visitor by name?</summary>

It's cached and served to everyone as one copy, so a greeting would be shown to every visitor. Anything personal has to be added in the browser after sign-in.
</details>
