# Web portal shell (EN-06): demo script

> **For:** the supervisor session on 5 Nov 2026. **Length:** about 10 minutes.
> **Runs on:** your laptop, with `next dev` and sample data.
>
> **Background reading:** [web-portal-shell-explained.md](web-portal-shell-explained.md) (the theory behind each step) and [web-portal-shell-public-vs-portal.md](web-portal-shell-public-vs-portal.md) (the diagram for step 1 and the question for step 6).
>
> **Changed since this demo (18 Nov).** The script still works on a laptop **without** a user pool (CI's placeholder `amplify_outputs.json`), where "View as" stands in for signing in. Three things look different:
> - public pages are **teasers** now, ending in "See more on Tezera" (step 6's question was answered: teaser only);
> - freelancers have their own addresses: tools at `/freelancer`, profiles at `/freelancers/<id>` (sample: `/freelancers/fre-sample-1`);
> - the avatar in the top bar opens an account menu with Log out.
>
> **With your own sandbox** (`corepack pnpm sandbox --outputs-out-dir apps/web`), "View as" disappears and you sign in for real: sign up once per role at `/<role>/signup`, and each log in lands on `/dashboard`. That also lets you show step 5's redirect live, which this script says can't be shown.

---

## Before the meeting

### The night before

1. Start the app (below) and go through this whole script once, out loud.
2. While rehearsing, take screenshots (Windows + Shift + S) and keep them in one folder. If the laptop or the app misbehaves tomorrow, show those instead.
3. **Don't `git pull` before the demo.** Today's pull broke the colours (see [web-portal-shell-colour-tokens.md](web-portal-shell-colour-tokens.md)).

### Ten minutes before

1. In a VS Code terminal:

   ```
   cd apps/web
   corepack pnpm dev
   ```

   Wait for `✓ Ready`. The app is at **http://localhost:3000**. If port 3000 is busy, Next picks the next free port and prints it; use that one.
2. **Open every address below once.** In development, each page is compiled the first time someone opens it, which can take several seconds. Do it now, not in front of your supervisor.
3. Open `/dashboard` and set **View as** (the box in the bottom-right corner) to **Organiser**.
4. If the last items in the sidebar are cut off, zoom the browser out to 90% (Ctrl and minus).
5. Use `pnpm dev`, not a production build. A production build has no sample data and nobody signed in, so every portal page would send you to the login page, which isn't merged yet.

| What | Address (after `http://localhost:3000`) |
| --- | --- |
| A shared event | `/events/evt-sample-1` |
| A postponed event | `/events/evt-sample-2` |
| A draft event (should say "Event not found") | `/events/evt-sample-draft` |
| An organiser's public profile | `/organisers/org-sample-1` |
| A freelancer's public profile | `/freelancers/fre-sample-1` (was `/vendors/ven-sample-2` until 18 Nov) |
| The dashboard | `/dashboard` |
| Organiser tools | `/organiser` |
| Admin tools (to try as a vendor) | `/admin` |

---

## The demo

### Step 1: Set the scene (1 minute, nothing on screen)

Say:

> "EN-06 is the web portal shell: the frame every signed-in page sits in, and the rules for who gets into which part. It doesn't build features. The feature tickets plug into it. It comes after authentication in our foundations chain, and four tickets depend on it."

Then show the diagram from section 4 of [web-portal-shell-public-vs-portal.md](web-portal-shell-public-vs-portal.md): the public area at the top, two gates, the portal below.

### Step 2: A visitor opens a shared link (2 minutes)

1. Open `/events/evt-sample-1`.
   > "This is what someone sees when an event is shared on WhatsApp. No login. The server builds the finished page, so WhatsApp and Google can read it."

   Point at "(sample)" in the names:
   > "The backend doesn't exist yet, so this is sample data that only appears on my machine."
2. Click the organiser's name, then point at **Contact details**.
   > "You have to sign in to see these. That was a privacy decision. The upcoming events list leaves out drafts."
3. Open `/events/evt-sample-draft`.
   > "Drafts are never public, even if someone guesses the link."
4. *(Optional)* Open `/events/evt-sample-2`.
   > "Postponed and cancelled events stay visible, so links people already shared don't break."
5. **Don't click "Log in".** The login page is in Danella's branch (EN-04) and isn't merged yet, so it shows "Page not found". If someone does click it, say exactly that, then press Back.

### Step 3: Explain the dashboard (3 minutes)

Open `/dashboard` as Organiser and walk through the screen by number:

```
+-------------------------------------------------------------+
| 1 logo   2 search............   3 messages, bell  4 role  5 |
+---------------+-----------------------------+---------------+
| 6 General     | 8 Dashboard     9 [Tools]   | 11 Panel      |
|   Home        |   one-line description      |               |
|   Feed ...    | +-------------------------+ | 11 Panel      |
| 7 Organiser   | | 10 No events yet        | |               |
|   tools       | +-------------------------+ |               |
|               |                             | [12 View as]  |
+---------------+-----------------------------+---------------+
```

| # | Part | What to say |
| --- | --- | --- |
| 1–5 | Top bar | "The same on every page, for every role: logo, search, messages, notifications, your account type (4) and your profile (5)." |
| 2 | Search | "The hint changes with the role: organisers look for providers and events. Search itself is a later ticket." |
| 3 | Messages and bell | "Placeholders for now. Messaging and notifications have their own tickets." |
| 6 | General | "Pages every role shares. They exist once, not as a copy per role." |
| 7 | Role tools | "Only this role's tools. The dashed items are 'coming soon': other tickets build those pages, and the shell keeps their place." |
| 8 | Title | "Everyone has the same dashboard address. The description changes with the role." |
| 9 | Tools button | "A shortcut into this role's own area, which only this role can open." |
| 10 | Empty state | "The standard 'nothing here yet' box we use everywhere. It tells people what will appear here." |
| 11 | Side panels | "These come straight from the team's wireframes." |
| 12 | View as | "A stand-in for login that only exists in development, so I can show every role. It isn't part of the product." |

### Step 4: One shell, five roles (2 minutes)

Change **View as** in the corner, one role at a time:

| Role | Point out |
| --- | --- |
| Vendor | Green colours, vendor tools (Booking requests, Job posts, Stalls…), a different search hint |
| Freelancer | Same green, but no Stalls and no My stall listing: freelancers don't take stalls |
| Consumer | Coral colours and no tools section: everything consumers do is on shared pages |
| Admin | Admin tools (Verification requests, Reports, Moderation, Users) and no side panels, because there's no admin wireframe yet |
| No role yet | "Finish setting up your account": what someone sees if sign-up breaks halfway |

Say:

> "Same code, same address. The role decides the colours, the tools and the panels."

### Step 5: The doors are locked (2 minutes)

1. Set View as to **Organiser** and click **Organiser tools**. The organiser tools page opens.
2. Still on that page, switch View as to **Vendor**. You land back on the dashboard. Point at the address bar: it now says `/dashboard`.
3. As Vendor, type `localhost:3000/admin` into the address bar and press Enter. You're sent back to the dashboard again.

Say:

> "Hiding a link in the sidebar isn't the security. This check runs on the server for every page, so typing the address doesn't get round it."

If they ask what happens when you're not signed in:

> "You're sent to /login. I can't show that on my machine, because the stand-in always signs you in as someone. In a production build nobody is signed in, so every portal page redirects."

### Step 6: Close (1 minute)

- **Done:**
  - role-based layouts and both gates;
  - the standard loading, error and empty states;
  - public event and profile pages with sample data.
- **Next (Phase B):** real sign-in and real data. That waits for:
  - EN-04 (authentication);
  - the backend (EN-03);
  - team AWS access;
  - the stack decision.
- **Ask them:**
  > "How much should be public? I'm proposing teaser-only public pages: enough for a WhatsApp preview, with everything else behind sign-in."

  That's section 3 of [web-portal-shell-public-vs-portal.md](web-portal-shell-public-vs-portal.md).
- **Documentation:** point to the decision record ([web-portal-shell.md](web-portal-shell.md)) and the learning notes next to it.

---

## If they ask

| Question | Answer |
| --- | --- |
| "Why is everything empty?" | "Each page's content belongs to its own ticket. The empty states say what will appear there." |
| "Is this the final design?" | "It follows the team's wireframes. The visual design system is Reshan's ticket, EN-07." |
| "Why not just hide pages from the menu?" | "Anyone can type an address. Only the server-side check stops them." |
| "How do you know it works?" | "Lint and type checks, plus screenshots of every role and every public page." |
| "What's the N in the corner?" | "Next.js's developer badge. It only appears in development." |
| "Why does the search box say something different for each role?" | "The hint follows what each role looks for: organisers search for providers and events, vendors for events, organisers and job posts." |

---

## If something goes wrong

| Problem | What to do |
| --- | --- |
| A page is slow to appear | It's being compiled on its first visit. Wait a few seconds. This is why you open every page beforehand. |
| You clicked "Log in" and see "Page not found" | "The login page belongs to EN-04 and isn't merged yet." Press Back. |
| A red error box appears | Press Esc and refresh. If it keeps happening, stop the terminal (Ctrl and C) and run `corepack pnpm dev` again. |
| The colours are gone | Someone's change to the shared styles came in with a pull. Don't pull before the demo; show your rehearsal screenshots. |
| "Port 3000 is in use" | Next uses the next free port and prints it. Open that address. |
