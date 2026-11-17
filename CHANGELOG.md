# Changelog

Every release of Matchpoynt, newest first. Each release is tagged in git with its version (for example `0.2.0`), and the app shows what's new once per release when you open it.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [0.5.0] - 2026-11-18

Your record across every club and sport, a club picker for players, payments in parts, announcements, breaks and session sign-up, emails sent by Matchpoynt itself, and a smoother intro.

### Added

- **Your record**: everything you've played across your clubs, sports and sessions. Your record by sport and by club, your full match history filtered by sport, club or session, and your badge collection showing how often, in which sports and in which sessions you earned each badge.
- **Your sessions**, on Your record: every session you played in with your place on its final leaderboard, your wins and losses and the badges you earned there, its games, and **Share** for its result images.
- **Session sign-up**: planned sessions can take sign-ups directly, with an optional player cap; members see who's coming, can drop out, and get a "Coming up" reminder on Playing now the day before.
- **Taking a break**: players can sit out from their phone and come back when they're ready; the Queue Master can give anyone a break, and sees who's away under the queue.
- **Club announcements**: owners post, pin, edit and delete news on the club's new Announcements page, and members read it on the club's page.
- **People's profiles** (`/u/<username>`): anyone signed in can open someone's profile from Friends (their photo, city, sports and tiers, links and clubs) and add them, answer them or remove them from there.
- **Rivals**: who you play against most and your record against them, and your regular partners.
- **Your record as pages**: Overview, Match history, Sessions, Badges and Rivals each have their own page; Overview, Sessions and Badges are tabs in the phone's bottom bar.
- **Check in from your phone** on Playing now, without scanning the QR at the venue.
- **Your next match up front** on Playing now, with roughly when it starts, worked out from the matches before yours and how long this session's matches take.
- **Your place and points** on Playing now: where you stand on the session's leaderboard, points for and against, and the fee so far when the session charges one.
- **Alert me when I'm called**: your phone buzzes and notifies you when you're up next or on court.
- **Friends here** and **About this session** on Playing now: which of your friends came, and the format, time limit, courts and fee.
- **Change your email** from your profile settings: a link goes to the new address, and the old one can undo the change.
- Pages for every emailed link: email confirmed, email changed, change undone, and a clear page when a link has expired or doesn't work, saying what to do instead.
- A **loading bar** on the intro while the app loads.
- **Pay in parts**: record a downpayment and the rest separately, each tagged cash or online. A fee can ask for a downpayment.
- **Payment QR codes**: clubs add the QR codes players pay with, framing each one like the club's photos. Players who still owe see them when a session ends, and on every past session's page.
- **Your session pages**: open any past session from Your record to see its leaderboard, your result and badges, what you owe and paid, and its feedback form.
- **Invoice and expense pages**: the club's invoices and expenses are lists, and each opens its own page with every detail.
- **Pick your club when you sign in**: players see their clubs full screen, animated, as logo cards, and pick the one they're playing with; the app takes on its colours and its photo replaces the logo. Find clubs is on the same page.
- **Player or club owner**: accounts that do both choose how they're using Matchpoynt each time they sign in, and can switch from the account menu.

### Changed

- **Emails come from Matchpoynt itself**: password resets, email confirmations, changes of email and club invites are sent by Matchpoynt with its own design and links, instead of Firebase's plain emails. Club invites are branded for the first time.
- **Going from the intro to the app** waits for your club's colours, turns to them, then pauses a moment with the logo bobbing before the app appears.
- A bigger **impact** when the logo's arches crash together: a flash and two rings bursting out.
- The bottom bar's tabs sit closer together so every label fits on small phones.
- New accounts start as **players** in the sign-up form.
- The **session board** no longer opens a session by itself: it lists your running sessions and your previous ones, and each opens its own page. A finished session's leaderboard, results and invoices stay on that session's page.

### Removed

- The **Past sessions** page: your finished sessions are listed on the session board instead, and old links lead there.
- The **Session invoices** page: each finished session's invoices are on its own page, and a club's on the club's Invoices page; old links lead to the session board.

### Fixed

- The impact ring no longer shows in the middle of the intro before the logo arrives.
- The tagline shows again while the intro hands over to the app.
- The logo's arches stay interlocked while they bob.

## [0.4.0] - 2026-11-16

Your session from start to finish: the live view on court and after the session ends, leaderboard images, and a phone layout built around Playing now.

### Added

- **Session ended screen**: when a session ends, Playing now turns into it by itself, with the club's feedback form for that session and the final leaderboard.
- **Match history** on Playing now: every finished match of the session, under what's happening now.
- **Your badges on Playing now**: the badges you've earned in the session, the club's own included (career ones count your earlier club sessions), on the waiting card and "You are now playing".
- **Download the whole leaderboard** as one image: everyone's place, record and points, on a black, white or transparent background.
- **Preview the feedback form** as members will see it, before or after saving it.
- **Friends** in the phone's bottom bar.
- **Branded emails** from Matchpoynt for resetting your password and confirming your email.

### Changed

- **Share images** show the Matchpoynt logo instead of the name in text, and the club's photo and name for a club's session.
- On a leaderboard, **only you can share images of your own results**.
- **Playing now animates**: cards rise in and figures count up, the queue slides as it changes, the two sides come together in "You are now playing", and the card hands over when you go on or off court.
- "You are now playing" calls the other side **Opponent side**.
- **Opening the website while signed in** goes straight from the intro to your board: the intro waits for it to load, then takes on its colours as it hands over.
- **On phones**, the menu is at the top left with the logo in the middle and your account at the top right. Playing now sits in the centre of the bottom bar, lit and pulsing while you're on court and reading "Waiting" while you wait.
- **Player-only accounts** no longer see the session board, its history or invoices; they land on Playing now.
- **Forgot password** takes your email or username, and shows "Check your inbox" with a way to send the link again.

### Fixed

- Club details are no longer out of date after reloading the page straight after changing them.

## [0.3.0] - 2026-11-16

Playing together: a live view for players, friends, club roles and feedback, and a new look for the logo and club cards.

### Added

- **Playing now**: follow a club session you're on from your phone: how long you've waited, your place in the queue and the matches before yours, who's on court and who plays next. On court it says "You are now playing" with your court and both sides, and the queue and the session's leaderboard have tabs of their own.
- **Friends**: add players, members and club owners by name, email or @username, and answer friend requests.
- **Member roles**: owners make members a captain, coach, Queue Master or manager. Players see them as the club's team on its page.
- **Post-session feedback**: each club builds its own feedback form (ratings, multiple choice, yes or no, written answers). Members answer it for sessions they played in, and owners see each session's results.
- **Sign in with your username** as well as your email.
- **Share images on black, white or transparent**: pick the background before sharing or downloading a player's cards.
- A **loading screen** when a club opens, with its photo and name in its colours.

### Changed

- The Matchpoynt logo replaces the name in text across the website and app, and the intro animation crashes its two arches together.
- The logo takes on a club's accent colour wherever the club's colours are shown.
- Club cards on Find clubs are big squares in the club's colours, with its photo, name, @handle, members and a "Join" button over a soft blur.
- Player-only accounts no longer see creating or managing clubs; they find and join clubs instead.
- Error messages are shorter: what failed and why, without the technical details.

### Fixed

- "What's new" now closes when you close it, without a page refresh.
- Share image previews no longer show as broken images.

## [0.2.0] - 2026-11-11

Clubs grow up: fees and invoices, accounting, a club directory with joining, handles and profiles.

### Added

- **Joining fees** for sessions: fixed, per game, or a base price plus per game. Clubs save their own fee scheme and use it in setup.
- **Invoices** written when a session finishes, one per player, with paid ticks. A Session invoices page lists them by session.
- **Manual invoices** for anything outside a session (dues, shirts, entry fees), paid per person or split from a total.
- **Club accounting**: expenses (club-wide or per session), billers, and a dashboard with monthly earnings, collected, spent and still owed, filtered by date.
- **Club pages**: a dashboard with "Finish setting up", plus its own Sessions, Members, Badges, Invoices, Expenses, Billers and Accounting pages. Settings live behind one button, grouped in a sidebar.
- **Step-by-step club creation** (details, colours, fees, review), with defaults allowed.
- **Club @handles** and **usernames**, checked as you type so they stay unique.
- **Social links** for clubs and people, shown with each platform's logo.
- **Your profile** page: photo, record, badges, clubs and games, older games a page at a time.
- **Find clubs**: every club with a handle, with search. Each club has a page for players with its sessions, badges to earn, fees and leaderboard.
- **Joining clubs**: join at once or ask the owner, as the club chooses, with a welcome message and links for new members. Members can ask to join a session.
- **Club QR** opening a join page with the club's cover, where people sign in or sign up, fill in what's missing and join.
- **In-app invites**: owners find people by name, email or @username (photos included) when adding members.
- **Saved themes** for clubs, and a page colour for the centre panel.
- **Scoring ceilings** of 30, 31 or 35 as part of the scoring format.
- **What's new**: this changelog, shown once per release.

### Changed

- The sidebar is grouped into **You** (your sessions, invoices, finding clubs, your profile) and **Club** (the club's pages), each under its own switcher.
- Opening the session board no longer opens session setup by itself; start one with "Set up session" or "New session".
- Every club needs an @handle. Clubs without one are asked for it before anything else.
- Your display name is your username.
- Multi-step forms only move on once their required fields are filled in.
- Long lists (clubs, club sessions, invoices, expenses) load a page at a time.
- Google sign-in links to an existing account with the same email, and brings your Google photo if you have none.
- Club and profile details are kept on this device, so pages open without waiting for them.

### Removed

- "Email me a sign-in link" on the sign-in form.

## [0.1.0] - 2026-11-10

The first release: court sessions with fair queues, scores and leaderboards, on the web and the desktop app.

### Added

- **Session board**: courts, a fair automatic queue or manual placement by drag and drop, check-in by QR, match timers and scores.
- **Matchmaking** by skill tier, with auto-fill of open courts.
- **Leaderboards** with a podium, badges, hot streaks, live ranking changes and share images; publishable as a public link.
- **Tournaments**: single and double elimination, round robin, and pools then knockout, with public bracket links.
- **Clubs**: rosters, planned sessions, photos, colours and the club's own badges.
- **Accounts** with email and password, Google sign-in, and guest mode.
- **Multi-sport** rules for badminton, pickleball, tennis, padel, table tennis and volleyball.
- **Desktop app** built with Tauri.
- Deployment with Docker Compose or Vercel.
