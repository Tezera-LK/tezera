# TEZERA

A mobile app and web portal where Sri Lankan event organisers hire vendors and freelancers, and attendees find events and each other. Every finished job leaves a review the next organiser can read.

**Second-year Agile Team Project (SDGP)** · Started September 2026

> **Status:** early development. Nothing here is production-ready yet.

## Why Tezera

Running one event in Sri Lanka usually means juggling five separate channels: promoting the event, selling tickets, hiring vendors and freelancers, sharing the venue layout and keeping attendees updated. Tezera brings these into one place and builds a track record for every vendor and freelancer through reviews.

## Who it is for

| Role | What they do on Tezera |
| --- | --- |
| **Organisers** | Create and promote events, hire vendors and freelancers, manage stalls and the venue map |
| **Vendors and freelancers** | Build a profile, get booked directly or apply to job posts, collect reviews |
| **Attendees** | Discover events, follow organisers, meet other attendees through the community |
| **Admins** | Verify accounts, moderate content, handle reports |

## Modules

1. **Events and promotion:** create events, publish them to a promotion feed
2. **Hiring marketplace:** direct booking or job posts, stalls, reviews and ranking
3. **Community:** attendee profiles, groups and chat
4. **Venue maps:** stall layout pinned on a venue map, with an optional 3D viewer

## ATP scope

Delivered during the Agile Team Project:

- Accounts and verification
- Events and promotion feed
- Hiring marketplace and stalls
- Reviews and ranking
- Community and chat
- Venue maps (3D view if time allows)
- Admin and moderation
- Sinhala and Tamil, if time allows

Planned for after the ATP, and **not** built here yet: ticketing and entry (QR tickets, gate scanning), in-app payments and commission, hiring for private events, and premium accounts.

## Tech stack

> TODO: fill in once confirmed against the PRD's recommended stack.

| Layer | Choice |
| --- | --- |
| Mobile app | TBC |
| Web portal | TBC |
| Backend / API | TBC |
| Database | TBC |
| Auth | TBC |
| Hosting | TBC |

## Repository structure

> TODO: update as the structure settles.

```
.
├── mobile/      # Mobile app
├── web/         # Web portal
├── backend/     # API and services
├── docs/        # Developer notes (project documents live in the docs repo)
└── README.md
```

## Getting started

> TODO: replace with real commands.

### Prerequisites

- Node.js / runtime versions: TBC
- Package manager: TBC
- Any accounts or API keys needed: TBC

### Setup

```bash
git clone <repo-url>
cd tezera

# install dependencies
# copy environment file
cp .env.example .env

# run the backend
# run the web portal
# run the mobile app
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| TBC | TBC |

Never commit `.env` files or secrets.

## Project documents

Planning and research live in the separate documents repo: **[link to documents repo]**. The useful ones when building:

- **Product requirements document:** requirement IDs, MoSCoW priorities, non-functional requirements (including Sri Lanka's Personal Data Protection Act)
- **Architecture diagram:** how the apps, backend and services fit together
- **User stories:** Given / When / Then scenarios mapped to PRD requirement IDs
- **Brand manual:** palettes, type, icons and motion rules for the organiser, vendor and attendee accounts

Reference PRD requirement IDs in issues and pull requests so work stays traceable.

## Roadmap

1. **Discovery:** interviews and surveys to confirm the backlog (done)
2. **ATP release:** mobile app and web portal with the scope above
3. **Live pilot:** one or two partner organisers run a real event through Tezera, producing the first reviews and SDG measures
4. **Decision point:** the group decides whether to take Tezera further
5. **Beyond the ATP:** ticketing and entry, then in-app payments, then private events, then premium accounts

## SDG alignment

Primary: **SDG 8** (decent work and economic growth). Secondary: **SDG 9**. Supporting: **SDG 10**.

## Contributing

> TODO: adjust to the team's agreed workflow.

- Branch from `main` using `feature/<short-name>` or `fix/<short-name>`
- Keep pull requests small and link the issue and PRD requirement ID
- At least one teammate reviews before merging
- Commit messages in the imperative: "Add vendor profile screen"

## Team

- Damian De Cruz
- Danella De Cruz
- Navindu Ranwatte
- Reshan Tennekoon
- Yevan Dewathanthriarachchi

## Licence

> TODO: choose a licence, or state that the code is not licensed for reuse while it is a university project.
