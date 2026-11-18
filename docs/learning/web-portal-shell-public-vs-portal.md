# Public pages and the portal: how far the public side goes

> **Companion to** [web-portal-shell.md](web-portal-shell.md) (the decision record) and [web-portal-shell-explained.md](web-portal-shell-explained.md) (the theory).
>
> **Written:** 2026-11-04 · **Status (18 Nov):** Navindu picked the teaser model (column B in section 3), and it's **built**. Section 7 now says what was built and how it differs from the 4 Nov plan. Until 18 Nov the code had column A.

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
| **Status** | Built 3 Nov, replaced 18 Nov | **Chosen and built 18 Nov** | Considered on 4 Nov, then reopened because of shared links |

**Recommendation: B, teaser only.** It keeps shared links and preview cards working, which is the backlog's main reason for having public pages, while everything useful needs an account. It also keeps the privacy story short: a handful of fields per page, all of them meant for strangers.

---

## 4. The two areas, drawn (teaser model)

```
                          ANYONE (no account)
+---------------------------------------------------------------+
| PUBLIC: read-only, one item at a time, only by exact link     |
|                                                               |
|  /                  landing page (Yevan)                      |
|  /login, sign-up    Danella, EN-04 (/<role>/login and so on)  |
|  /events/<id>       teaser: title, date, city, organiser name |
|  /organisers/<id>   teaser: name, district, verified badge    |
|  /vendors/<id>      teaser: name, category, verified badge    |
|  /freelancers/<id>  teaser: name, category, verified badge    |
|                     each ends with  [ See more on Tezera ]    |
|                                                               |
|  NOT public: browsing or search, drafts, contact details,     |
|  consumer profiles, any button that does something            |
+-------------------------------+-------------------------------+
                                |
                                |  GATE 1: proxy.ts + requireSession()
                                |  not signed in -> a log-in screen
                                v
+---------------------------------------------------------------+
| PORTAL: signed in only, hidden from Google                    |
|                                                               |
|  /dashboard and the shared pages: feed, messages, profile...  |
|  full event details, contact details, booking, reviews        |
|        |                                                      |
|        |  GATE 2: requireRole()    wrong role -> /dashboard   |
|        v                                                      |
|  /organiser/*  organiser      /vendor/*      vendor           |
|  /freelancer/* freelancer     /admin/*       admin            |
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
5. **The role comes from the account.** Each account has exactly one role, set at sign-up as a Cognito group. You can't pick a role when you log in: using organiser tools needs an organiser account. The "View as" box only exists in `next dev` without a user pool, never in production.

---

## 6. How strict is it today?

| Layer | 4 Nov (Phase A) | Since 18 Nov |
| --- | --- | --- |
| **Gate 1: signed in?** | `requireSession()` with a stand-in identity: in `next dev` always the "View as" role, in a production build nobody. | **Real:** `proxy.ts` and `requireSession()` read the Cognito tokens from the cookies and check their signature. Signed out → a log-in screen. ("View as" only in `next dev` without a user pool.) |
| **Gate 2: right role?** | `requireRole()` in each tools folder's layout and in every page inside it. | The same code, now with the real Cognito group |
| **Layer 3: backend rules** | Doesn't exist yet: there's no data backend. | Still waiting for EN-03. Rules on every read and write; guests only get teaser fields, and drafts never leave the database. |
| **Public data** | Sample data in `next dev`, nothing in production builds. | The same, now cut down to teasers. Later: read as a guest, through those rules |

Gates 1 and 2 are real now. The lock that actually protects the data (layer 3) arrives with the data backend. Until then nothing real can leak, because there is no real data.

---

## 7. What changed for the teaser (built 18 Nov)

The 4 Nov plan, and what was actually built:

- **Types:** `PublicEvent`, `PublicOrganiser` and `PublicProvider` (was `PublicVendor`) in `lib/data/types.ts` hold only the teaser fields. `lib/data/public.ts` copies those fields out by name, so a field added to the backend later can't become public by accident. Checked on a build with sample data: no summary, venue or description appears anywhere in the HTML.
- **Pages:** the four teasers show only those fields. The organiser's upcoming-events list, the link to the organiser and the locked contact-details box are gone.
- **"See more on Tezera":** a box at the end of each teaser with **Log in** and **Create an account**. *Changed from the plan:* the buttons don't come back to the same page after logging in. Danella's log-in form doesn't read `?next=` yet, and coming back to the same teaser shows nothing new until the full pages exist. People land on `/dashboard`, like every log in.
- **Logged-in visitors:** the browser looks for Amplify's login cookie. If it finds one, the header button says "Your dashboard" instead of "Log in", and the box says full pages are coming soon. The cached page itself is the same for everyone.
- **Link previews:** each teaser has Open Graph tags (title, a one-line description, site name), which is what WhatsApp reads. The preview image stays with US-C15-T4.
- **Freelancers:** their profiles moved to `/freelancers/<id>`, to match their own `/freelancer` area.
- **Full details for signed-in users:** still open. Either the same address adds the details in the browser once you're signed in, or signed-in users get a portal page for each event. The full-page stories (US-C03-T3, US-P04-T3, US-P01-T3) decide.
- **Jira:** EN-06-T3's "done when" and US-P01's "public view" still need rewording. US-C15 stays as it is.

---

## 8. Questions to settle

1. A, B or C? **Answered 18 Nov: B, teaser only** (Navindu).
2. If B, which fields go in each teaser? **Built as proposed in section 3**: events also show Postponed or Cancelled.
3. Teasers for profiles too, or for events only? **Profiles too.** Vendors and freelancers share their profile link to win work (US-P01).
4. Where do signed-in users see an event's full details? *Still open (section 7).*
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
<summary>3. In <code>next dev</code>, can you show a signed-out visitor being turned away from the portal?</summary>

Only with a real user pool. Once `pnpm sandbox` has written a real `amplify_outputs.json`, `next dev` uses real sign-in: log out and open `/dashboard`, and you're sent to log in. With CI's placeholder file nobody can sign in, so the "View as" box signs you in as its role instead.
</details>

<details>
<summary>4. Why can't a public page greet the visitor by name?</summary>

It's cached and served to everyone as one copy, so a greeting would be shown to every visitor. Anything personal has to be added in the browser after sign-in.
</details>
