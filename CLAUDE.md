# Matchpoynt
Matchpoynt is a multi-sport court session app for badminton, pickleball, tennis, padel, table tennis, volleyball and similar sports. It handles fair player queueing, court assignment, scores, fees and rankings for club nights and open play. It ships from one React codebase to two targets: the **website** (marketing pages, public rankings, sign-in, published session leaderboards) and a **desktop app** built with Tauri. Both are thin clients of one **API** (`server/`), which owns every rule. It began as a recreation of shuttleflow.ph. Nothing in the product, copy or config may assume a single sport.

# Minimum Technical Requirements (Mandatory)
- React
- shadcn/ui
- Tailwind CSS
- PNPM (workspace: root web app, `server/`, `shared/`, `test/`)
- Vite
- Typescript
- Tauri (v2) and Rust for the desktop app
- Hono on Node for the API (`server/`). `pnpm dev` runs the web app and the API together.
- Supabase (Postgres, Storage) for the backend, reached only from the API through `@supabase/supabase-js`
- Firebase Auth for accounts and sign-in (email and password, email links, Google, guests), reached only from the API through Firebase's REST API (`server/src/utils/firebase/`). No Firebase SDK runs in the browser or the desktop webview.
- Drizzle (`drizzle-orm`, `drizzle-kit`) for the database schema and migrations
- Zod for API input validation
- TanStack Query for data fetching in the web app
- GSAP (with `@gsap/react`) for JS-driven animation
- Docker
- Docker Compose

# Server-side Boundary (Mandatory)
- No API, auth, storage or business logic runs on the client. The web app and the desktop webview only render, collect input and call the Matchpoynt API. Everything else happens in `server/`.
- The client never imports `@supabase/supabase-js` or a Firebase SDK, never talks to Supabase or Firebase, never holds or reads a token, and never uploads straight to storage.
- "Business logic" includes queueing order, matchmaking, court assignment, score validation, deciding winners, leaderboards and rankings, fees, permissions and input validation. The client may shape form state (adding a court row to a draft), but whether that draft is valid is decided by the API.
- The client asks the server for derived data instead of computing it. The queue arrives ordered, `canStartMatch` arrives as a flag, and the leaderboard arrives ranked.
- Auth state lives in httpOnly, `SameSite=Lax` cookies set by the API. The client knows who is signed in only by calling `GET /api/auth/me`, and only while sign-in is on. Sign-in links point at `/api/auth/*`.
- Guest mode: with `FEATURE_WEB_SIGN_IN=false`, the API's `resolveUser` creates a guest (Firebase anonymous sign-in, `startGuest` in `utils/auth/session.ts`) on a browser's first write, so sessions still have an owner and RLS still applies. Reads never create guests. Guest data lives as long as the browser's cookies. This needs the Anonymous provider turned on in Firebase (Authentication > Sign-in method).
- The client shows server errors in an error banner (`components/feedback/ErrorBanner`), never in a toast or the console. See Feedback Requirements.
- New features start in the API: endpoint, rules and tests in `server/`, then a hook in `utils/hooks/` and the UI.

# Architechtural Requirements (Mandatory)
- git ignore and docker ignore should be based on this project.
- Functions should be handled inside `utils` directory and separated by concern i.e. database connections, business-logic, auth, etc. In the web app, `src/utils/` holds UI concerns only: `api/` (the fetch client), `hooks/`, `forms/`, `platform/`, `desktop/`, `theme/`, `seo/`, `time/`. Business logic, auth and database code live in `server/src/utils/` (`session/`, `supabase/`, `http/`, `validation/`).
- Use Typescript custom interface and type or `extend` existing ones whenver possible or a needed. have them inside `types` and `interfaces` directory. Types used by both the web app and the API (request and response bodies, sport rules) live in `shared/src/types` and `shared/src/interfaces`.
- Use `@apply` and `@layer` in tailwind css whenever writing css to make thing reusable.
- Build the UI from shadcn/ui components. Add them with the shadcn CLI through `pnpm ui:add <name>` into `components/ui`, then compose or extend them. The wrapper runs `pnpm dlx shadcn@latest add` and works around shadcn 4.22 registry items importing `cn` from a bare `"cn"`. Do not hand-roll a primitive that shadcn already provides (button, badge, card, dialog, sheet, tabs, accordion, carousel, table, skeleton, etc.).
- Files in `components/ui` belong to the shadcn CLI. They are exempt from the one-export rule below. Brand changes go in as `cva` variants inside those files so `shadcn diff` stays readable. Every other component wraps them.
- `components.json` aliases must point into this structure: `utils` → `@/utils/cn`, `lib` → `@/utils`, `hooks` → `@/utils/hooks`, `ui` → `@/components/ui`, `components` → `@/components`. There is no `lib` directory.
- Have animations in the `animations` directory. Simple, state-driven motion (a pulse, a fade) is CSS keyframes registered as Tailwind `--animate-*` theme tokens. Everything JS-driven uses GSAP:
  - Each GSAP animation is a function in `animations/` that takes elements and returns a cleanup function (e.g. `splashTimeline`, `heroIntro`, `waveHeading`, `revealSection`, `marquee`, `landingSection`).
  - GSAP and its plugins (ScrollTrigger, SplitText) are registered once in `animations/registerGsap.ts`; import `gsap` from there.
  - Components run animations through `useMotion(ref, fn)` (`animations/useMotion.ts`, built on `useGSAP`), never with raw effects, so they are cleaned up on unmount.
  - Timings, eases and distances come from `config/motion.ts` (`motion.gsap`), never literals in the function.
  - Mark what moves with data attributes instead of extra refs: `[data-wave]` for a heading that rides in letter by letter, `[data-reveal]` for items that rise in order.
  - Split text with `SplitText` and `aria: 'auto'`, so screen readers still read the heading as one phrase.
  - Don't tween theme colours: they are `oklch`, which GSAP can't interpolate. Fade or move instead.
- Every animation must respect `prefers-reduced-motion`: `useMotion` skips GSAP entirely, the splash doesn't play, and CSS animations are cut to a single instant frame.
- Colors, fonts, font weights and sizes, and motion timings should be handled inside `config` directory. shadcn's semantic tokens (`--background`, `--primary`, `--card`, `--border`, …) are generated from `config/theme.ts`, never hand-edited in CSS.
- Feature toggles for web and desktop are environment variables on the API (`FEATURE_WEB_*`, `FEATURE_DESKTOP_*`). Their names and defaults live in `shared/src/config/features.ts`. The API parses them in `server/src/config/features.ts`, rejects malformed values at startup, and serves them at `GET /api/config`. Clients read them with `useFeatures()`.
- A toggle controls every surface of its feature, on both sides:
  - Web app: routes, navigation, buttons, cards, menus.
  - API: routes (`requireFeature`) and response fields (e.g. `publicUrl` is `null` while publishing is off).
  - Anything that depends on a switched-off feature must keep working in a reduced form, never ask for the missing feature. Example: with sign-in off, the board runs in guest mode instead of showing a sign-in prompt.
  - When adding a toggle, list every place it shows up and gate each one.
- Toggles fail closed. The web app renders no routes until `/api/config` first answers. If it can't be reached, every feature counts as off (`featuresOff`) and API-backed screens say the API is unreachable. A default is never used to switch a feature on.
- If API calls are done use nginx proxy to prevent CORS policy errors. The web app calls same-origin `/api`, which nginx forwards to the API container (Vite's dev server proxies `/api` to `localhost:8787`).
- queries should be done via ORM, have queries in `queries` directory. In practice that's `server/src/queries/`, using `@supabase/supabase-js` as the signed-in user. The web app has no `queries/`.
- secrets or API keys should be expected to be inside and handled by a .env file or its equivalent. `.env` is read only by the API and by migrations. Nothing reaches the web or desktop bundle: there are no `VITE_` variables.
- Whenever a block of elements gets created repeatedly have it as a component under `components` directory.
- A set of components being called by a parent component is a valid component i.e. Header, Footer, and Sections.
- Component files should only export one element. If exports are logically related create subdirectory/ies inside `components`
- Whenever data is being fetched for a component use skeleton components for them (shadcn `Skeleton`). A skeleton mirrors the loaded layout: same grid, the same `Card`/`Table` frames, column set, row and item counts, and element sizes, so nothing jumps when data arrives. Build it from the real container components with `Skeleton` blocks inside, and keep it next to the component it stands in for (`CourtCardSkeleton` beside `CourtCard`). The startup skeleton (`AppLoading`) matches the route being opened.
- Buttons, and navigations should have icons by default unless stated to omit (use `lucide-react`, shadcn's icon library).
- Include navigation in the footer but omit the icons.
- Website should omit logs and toast whenever errors is produced by API calls, missing required config values, or secrets. Errors get an error banner instead (see Feedback Requirements).
- Components should have search engine friendly labels and descriptions.
- Docker container should not have any secrets embedded inside it (it will be added on runtime).
- Docker container should be multi-stage.
- Building of the application, installs, or its equivalent should be handled on build stage.
- nginx, react and API builds should be on separate docker containers.
- alpine, slim, or its equivalent should be used if its available as base image.
- last user should not be root name it base on the project.
- container filesystem should be read-only.
- do not create files inside container during run-time, if files are needed it should either be copied from the project into the container during build stage or created during build stage.
- any files that is needed to be written should be inside a volume based on the host machine i.e. logs.
- use docker network to communicate between containers.
- docker compose should have `.local` and `.prod`.

# Session Board Requirements (Mandatory)
- Queueing is a per-session setting (`rules.queueing`), switchable from the board header and from Session settings:
  - **automatic:** the matchmaking algorithm picks who plays next, and auto-fill may start matches;
  - **manual:** the Queue Master drags every player onto a court; nothing is picked, and auto-fill is off.
- In both modes players can be dragged from the queue onto a side of an open court, between courts, and back to the queue. Placed players are stored on the court (`session_courts.lineup`) and leave the fair queue.
- Starting a match keeps placed players on their sides. In automatic mode the algorithm fills the open places; in manual mode the lineup must be full. Auto-fill never touches a court someone is arranging.
- The API decides every move (`assignPlayer`, `unassignPlayer`, `startBlockedReason` in `utils/session/engine.ts`) and says why a court can't start. The board shows that reason under the button. The web app only previews a drag optimistically (`utils/forms/lineupPreview.ts`) until the API answers, and reloads the board if the API refuses.
- Board changes run one at a time (one mutation scope), so each request carries the version the previous one produced.
- Every playing court shows its elapsed time. When the session's match time limit is on (Session settings > Rules), it also shows a countdown with a progress bar:
  - it turns to a warning for the last `board.timerWarningMs` (`config/board.ts`);
  - after the limit it shows "Over by m:ss", and a toast announces the court going over once.
  The API sends each match's `endsAt`, so the browser never works out the deadline itself. It also sends `serverTime`, and timers add the difference to the device clock, so a device with a wrong clock still shows the right times. Each playing court runs one clock; open courts don't tick.
- Every app page has a breadcrumb trail at the top, on the sidebar-coloured frame above the light page panel, in the sidebar's text colours (`AppBreadcrumbs`, shadcn Breadcrumb, built by `useBreadcrumbs` from what the page already loaded): e.g. "Session board / Past sessions", "Clubs / <club> / Members". Large display type, earlier steps dimmed and linked, the page on screen bold, "/" between, like the reference design; back links such as "← All clubs" sit under it.
- The app shell is exactly the screen's height (`AppLayout`). On the session page the main column scrolls on its own. While a session runs, the queue is a full-height panel on the right with a small margin (`.session-page-split`, `.session-queue-panel` in `index.css`); below `lg` it stacks under the board. Only the queue's player list scrolls (shadcn `ScrollArea`, `.board-queue`); its header stays put. The board and the queue panel share one `BoardDnd`.
- Every queued player shows how long they've waited for their next game (`WaitTime`, an hourglass and m:ss), in the next-match groups and the waiting list. The API sends `waitingSince` on each `PlayerView` (when they joined the queue: on check-in, or when their last match finished; `null` on court or not checked in). The panel runs one clock for all of them, corrected by `serverTime` like court timers, and waits over `board.longWaitMs` (20 min) turn to the warning colour.
- With automatic queueing the queue shows who plays next and against whom. The API sends `upNext`, from `upcomingMatches` in `engine.ts`: the session's matchmaking run over the queue, exactly as starting an empty court would pick and split it. The panel shows those matches, then the players still waiting for a full group. With manual queueing it's the plain call order.
- An open court can be removed from its card (trash button, confirmed first, `DELETE /api/sessions/:id/courts/:courtId`, `removeCourt`): never with a match on (playing courts show no button), never the last court or a running tournament's last court. The API sends each court's `removeBlockedReason`, shown as the disabled button's tooltip. Players placed on it go back to the queue; `save_session` deletes courts left out of the save.
- Above the courts, `BoardTools` holds adding a player (`AddPlayerForm`, compact) and "Add court" on one row, in a collapsible section (shadcn Collapsible; this browser remembers it open or closed, `boardTools` in `utils/platform/remember.ts`). "Add court": The API names the court (the first free "Court N"), enforces `maxCourts` (`canAddCourt` / `addCourtBlockedReason`), and auto-fills it.
- A Queue Master can run several sessions at once. Every session has its own page, `/app/<session id>`: its board while it runs (`GET /api/sessions/:id`), then "Session ended" with its leaderboard (`GET /api/sessions/:id/ended`), so the link keeps working after newer sessions. `/app` opens the running session this browser had open last (`utils/platform/remember.ts`), else the newest (`GET /api/sessions/active` lists them), else the last finished one's page (`GET /api/sessions/latest-ended`). Setup opens on its own only when there's no session at all; "New session" (`/app?new=1` from the sidebar) starts another without ending any. `?new=1` is handled once per visit (a flag in `SessionPage`): clearing it changes the address only after that render.
- Past sessions (`/app/past`, `PastSessionsPage`, a sidebar link under Courts and in `SessionSwitcher`) lists every finished session, newest first, a page at a time (`GET /api/sessions/ended?before=<ended_at>`, `sessionHistory.pageSize`), each card (`PastSessionCard`) opening the session's page with its final leaderboard. Finishing a session refreshes the list.
- `SessionSwitcher` lists the running sessions, "New session" and "Past sessions". It sits on the board's header and, with `ClubSwitcher`, at the top of the sidebar (`AppSwitchers`). Board queries are per session (`queryKeys.session(id)`), and changes run one at a time per session.
- Drag and drop uses `@dnd-kit/core` with mouse, touch (press and hold) and keyboard sensors, plus screen-reader announcements. Auto-scroll while dragging only kicks in right at the edge (`board.dragAutoScrollEdge`), so picking up a player at the bottom of the queue doesn't move the board. Every placed player also has a button to send them back to the queue without dragging.
- Courts are plain cards (`CourtCard`): the two sides as panels with "vs" between (`.court-matchup`, `.court-side` in `index.css`), no drawn court. Every card in a session is the same fixed height, open or playing: player rows are `.court-row`, the matchup is centred vertically in the card's middle (`.court-body`), and the footer sits at the bottom with one fixed-height slot (`.court-footer-slot`): a playing court's countdown above "Finish match" (`.court-timer`), or an open court's start-blocked reason, up to two lines, below its button (`.court-reason`).
- Restarting (`restartMatch`, `restartSession` in `engine.ts`):
  - A playing court has a "Restart match" icon button beside "Finish match" (confirmed first, `POST /api/sessions/:id/courts/:courtId/restart`): the same match replays with the same players on the same sides, the clock back to 0:00 and the score back to 0–0 (the score dialog is keyed by match and start time), nothing recorded. `save_session` saves a match's `started_at` (0018) so the new clock sticks.
  - A playing court also has "Cancel match" (`cancelMatch`, confirmed first, `POST /api/sessions/:id/courts/:courtId/cancel`): no result is recorded, the players go back to the queue where they were (starting a match doesn't move anyone in it), and the court opens without auto-fill refilling it straight away. A tournament match goes back to waiting for a court. Saves never delete matches, so `cancel_match` (security invoker, 0019) deletes that in-progress match and calls `save_session` in one transaction.
  - The board header has "Start over" (`StartOverButton`, confirmed first, `POST /api/sessions/:id/restart`): every result and match on court is cleared and the tournament dropped; courts, settings and players stay, check-ins included; everyone goes back to the queue in arrival order with no games played, and auto-fill starts again. Saves never delete matches, so `restart_session` (security invoker) deletes the session's matches and calls `save_session` in one transaction, with its version check.
- Deleting a session is separate from finishing it: "Delete session" (`DeleteSessionButton`, confirmed first, `DELETE /api/sessions/:id`) removes a running or finished session for good (courts, players and matches cascade; published links stop working). It's on the running board's header, the finished session's page and each Past sessions card. `useDeleteSession` drops it from the cached session lists at once (so `/app` never reopens it) and forgets it as the last opened session.
- The board header has a "Finish session" button (`FinishSessionButton`, confirmed first). It ends the session through `POST /api/sessions/:id/end`; finished results stay on the leaderboard and check-in closes. A session can't end while a match is on court: the API refuses (`endBlockedReason` in `engine.ts`), and the view's `canEnd`/`endBlockedReason` disable the button with the reason.
- Check-in: only checked-in players are matched, auto-filled or placed on courts.
  - Roster players from setup start not checked in, unless "Already checked in" is ticked for them (`MemberSetup.checkedIn`; the box starts unticked in setup and resets after each player). Players added from the board are checked in unless that box is unticked (`AddPlayerInput.checkedIn`, default true). In Session settings, ticking a waiting player checks them in; a recorded check-in can't be undone there.
  - The QR sits behind the "Check-in QR" button (`components/session/checkin/CheckInButton`), opened in a dialog with the check-in count. Its link (`/check-in/<128-bit slug>`) is made on first open (`POST /api/sessions/:id/check-in`) and then kept, so a printed QR keeps working.
  - Scanning opens `CheckInPage`: the player picks their name and checks in, signed out, through `/api/public/check-in/:slug` and the `security definer` functions `public_check_in_roster` / `public_check_in`. The function only records `checked_in_at` and doesn't bump the version.
  - The engine's `settleCheckIns` puts recorded check-ins into the queue in arrival order, at the late-joiner rotation, on every load. `save_session` never clears a recorded `checked_in_at`.
  - The queue card lists players still to check in under the queue, each with a "Check in" button for the Queue Master. While anyone is still to check in, the board polls (`board.checkInPollMs`) and toasts new check-ins.

# Club Manager Requirements (Mandatory)
- An account can run several clubs. "Clubs" in the sidebar (and site navigation) opens `/clubs` (`ClubsPage`), a picker styled like a streaming service's profile screen: big round club avatars (`ClubPickerTile`) on a deep stage, "Add club", and an "Edit clubs" mode (`?edit=1`; `?new=1` opens "Add club"). Each club has its own manager page, `/clubs/<club id>` (`ClubManagerPage`, `?tab=members|badges|info`), with four tabs:
  - **Sessions:** planned sessions as cards (`PlannedSessionCard`) and the sessions the club has run (`ClubSessionCard`, linking to `/app` or `/app/<session id>`).
  - **Members:** the roster (`MemberTable`), added and edited in `MemberDialog`.
  - **Badges:** the club's own badges (`ClubBadgesPanel`; see Club Badge Requirements).
  - **Club info:** name, description, profile photo and cover photo (`ClubInfoPanel`, `ImageUploadField`), and deleting the club.
- Members are a named roster: a name, optional contact and a skill tier per sport (`club_members`, `club_member_sports`). A member can be invited by email (`InviteMemberDialog`, `POST /api/clubs/:id/members/:memberId/invite`): the API stores an invite with an unguessable token (`club_invites`) and sends a Firebase email sign-in link (`sendSignInLink`, which creates the account if there is none) that returns through `/api/auth/action` to `/invite/<token>` (`InvitePage`). A new account fills in the sign-up form there with its own password (`SignUpForm` mode `invite`, email fixed); an existing one just joins. `POST /api/invites/:token/accept` saves the profile and password, then `accept_club_invite` (security definer, only for the email it was sent to, and only once Firebase has confirmed the caller owns it: `email_verified` on the token) links the account to the member (`club_members.user_id`). The members table shows Joined / Invited, with resend and cancel. Invites need `FEATURE_WEB_SIGN_IN` and `FEATURE_WEB_SIGN_IN_EMAIL`.
- Club photos can be aligned: in `PhotoEditDialog` (from the viewer's Edit, or Align on the Club info tab) `PhotoAligner` drags the photo (or arrow keys, Shift for bigger steps) and zooms it (`photoPositions` in `shared/src/config/club.ts`). The API checks and saves `{ x, y, zoom }` (`cleanPosition` in `server/src/utils/club/appearance.ts`, `PUT /api/clubs/:id/:kind/position`, columns `avatar_position`/`cover_position`); a new upload starts centred. Everywhere a club photo shows it's drawn by `PositionedPhoto` (or `ClubAvatar` with `position`) at that point and zoom.
- A club has its own colours (Appearance card on Club info, `ClubAppearanceCard`): an accent (buttons, highlights, the selected sidebar item) and a sidebar colour, from `clubThemePresets` or any colour. The API checks them and works out readable text and the sidebar's shades (`cleanTheme`, `themeOf`: WCAG contrast; `PUT /api/clubs/:id/theme`, column `theme`), sending `theme` on `ClubSummary`. `useClubTheme` (in `AppLayout`) sets those as the theme's CSS variables on the page root: a session's own club on its page (`clubId` on `SessionView` and `EndedSessionView`), the club on screen in the club manager, otherwise the club picked in the sidebar; Matchpoynt's colours otherwise.
- Clicking the club's profile or cover photo on its page opens `PhotoViewerDialog` (zoom with buttons or the mouse wheel, steps in `photoZoom` in `config/club.ts`) with an Edit button that opens `PhotoEditDialog`; with no photo yet, the click opens `PhotoEditDialog` straight away.
- `ClubSwitcher` (sidebar) switches clubs like switching profiles: round avatars and names, "Add club", "Edit clubs", "All clubs". It shows the club on screen or the one opened last.
- Typing a player's name (board's add-player form and session setup) suggests club members (`MemberNameField`, shadcn Command in a Popover; `GET /api/members/suggestions`). The API ranks them (`rankSuggestions` in `server/src/utils/club/suggest.ts`: the session's club first, then names starting with what's typed) and leaves out players already in the session or the draft. Picking one fills the name and, if set, their tier for the session's sport.
- A planned session (`planned_sessions`) holds a title, an optional date, the session settings, courts and a roster of club member ids. `PlanSessionDialog` reuses the session setup steps plus a Details step and a member picker (`PlanMembersStep`); the steps are `planSteps` in `config/planSetup.ts`. Starting a plan (`POST /api/clubs/:id/plans/:planId/start`) builds the setup from the members' current names and tiers (`planToSetup` in `server/src/utils/club/rules.ts`; no tier for the sport means the sport's first tier), then `start_planned_session` saves the session, carries over the club, title and cover, and removes the plan in one transaction. The board then opens at `/app`.
- Sessions can have a cover photo, set on the plan. Cards with a cover show it as their background (`CoverCard`, `.cover-card` with a `scrim` overlay so text stays readable): club cards, planned and club session cards, and the "Session ended" card.
- Photos (club profile and cover, session covers) are uploaded to the API as multipart forms (`PUT .../avatar`, `.../cover`, `.../plans/:planId/cover`). The API checks the size (`clubImages` in `shared/src/config/club.ts`, 5 MB) and the real type from the file's bytes (`sniffImage`), converts every photo to WebP (`toWebp` in `server/src/utils/image/webp.ts`: JPEGs turned upright from their EXIF orientation first, metadata such as GPS dropped, quality and a pixel limit in `server/src/config/images.ts`), then stores it in the `club-media` Storage bucket as the user, under `<owner id>/<club id>/<kind>-<uuid>.<ext>` (Storage RLS allows writes only in the owner's folder). Replaced and removed photos are deleted; covers that started sessions still use are kept when a club is deleted.
- Photos are served same-origin at `/api/media/<path>` (`routes/media.ts`), so no Supabase host is added to `img-src`. The bucket is public for reads and names carry random UUIDs, so responses are cached for good. Only upload paths get a large body: `limits.uploadBodyBytes` in the API, and a matching `client_max_body_size 6m` location in `docker/proxy/nginx.conf`.
- Club rules (names, descriptions, limits, member tiers, plan validation) live in `server/src/utils/club/`; every change answers with the whole `ClubView`, so the page only renders it. `FEATURE_WEB_CLUBS` gates the API routes (`/api/clubs`, `/api/media`), the routes, the navigation item, and photo URLs (`coverUrl`/`avatarUrl` are `null` while it's off).

# Club Badge Requirements (Mandatory)
- A club can create its own badges (`club_badges`), on the club page's Badges tab (`?tab=badges`, `ClubBadgesPanel`, also a sidebar link). Each has a name, an optional description, a scope and up to `clubBadgeLimits.maxConditions` conditions, all of which must be met:
  - **scope:** `session` (earned on one session's leaderboard from its results) or `career` (totals over every session the club has run);
  - **conditions:** "metric at least min", metrics in `clubBadgeMetrics` (`shared/src/config/club.ts`): wins, matches played, wins in a row (session only), points scored, point difference, win rate %, sessions played in (career only).
- The rules are pure TypeScript in `server/src/utils/club/badges.ts`: `cleanBadge` (validation), `badgeSummary` (the plain-language `summary` the API sends), `careerTotals`, `awardClubBadges`, `memberCareerBadges`. Totals reuse the leaderboard's `tally`, so a win means the same everywhere.
- Club badges apply to sessions with a `club_id` (started from a club's planned session). The session's Leaderboard tab and the public leaderboard send the club's badge definitions (`clubBadges`) and each entry's earned ids (`entry.clubBadges`); chips (`ClubBadgeChip`) show on the podium (club badges first), the table and the spotlight, and share images get one card per club badge. The Members tab shows each member's career badges.
- Career totals match players to each other and to members by name: trimmed, spaces collapsed, lower case (`careerKey`, and the same expression in SQL). Session players aren't linked to member ids.
- Published leaderboards read badges through `public_leaderboard` (now returns `club_badges`) and career history through `public_club_history`, a `security definer` function that returns only the players named in that session and the matches they played, never other names.
- Icons: uploaded (GIF, JPEG, PNG or WebP up to 5 MB, `checkBadgeIcon`) or picked from GIF search. GIFs are stored as GIFs so they keep moving; other images become WebP. Stored at `<owner>/<club>/badge-<uuid>.<gif|webp>` in `club-media` (the bucket now allows `image/gif`) and served at `/api/media/...`. Under reduced motion `ClubBadgeIcon` draws only the GIF's first frame on a canvas.
- GIF search uses GIPHY through the API only (`GET /api/gifs/search`, `server/src/utils/gif/giphy.ts`, `config/gifs.ts`). `GIPHY_API_KEY` stays in the API's env; the browser gets results whose previews load from `https://*.giphy.com` (in `img-src` in `docker/proxy/nginx.conf` and `src-tauri/tauri.conf.json`). A picked GIF is downloaded by the API (only from GIPHY's media host) and stored as the badge's icon (`POST .../badges/:badgeId/icon/gif`), so leaderboards never load from GIPHY. Search results show "Powered by GIPHY".
- Toggles: `FEATURE_WEB_CLUB_BADGES` (default on; needs clubs) gates the routes, tab, nav link, leaderboard fields and member badges. `FEATURE_WEB_GIF_SEARCH` (default off) gates the search route and tab; the API refuses to start with it on and no `GIPHY_API_KEY`. With search off, icons can still be uploaded.

# Tournament Requirements (Mandatory)
- Every court card has a "Tournament" switch (`CourtTournamentSwitch`). Switching the first court on opens `TournamentSetupDialog`, where the Queue Master picks:
  - **format:** single elimination, double elimination (losers bracket, grand final, and a reset final when the losers-bracket side wins it), round robin, or pools then knockout (pool count and how many go through);
  - **entrants:** in singles every player is an entrant; with more per side, fixed teams (balanced by tier, random draw, or picked by hand in `TeamPicker`) or rotating partners (round robin only: new partners every round, players ranked one by one);
  - the checked-in players taking part, and seeding (by tier or random).
  More courts join or leave with their switch (`PUT /api/sessions/:id/courts/:courtId/tournament`); a court with a match on can't switch.
- While a tournament runs, the queue panel lists who's competing as checkboxes (`TournamentCompetitors`: competitors ticked, waiting players unticked). Ticks only shape the selection (in doubles players join in pairs); "Update tournament" sends the whole list (`PUT /api/sessions/:id/tournament/competitors`) and the API redraws the bracket with the same settings (`setTournamentCompetitors` in `tournament/setup.ts`, using the setup stored on the tournament). Competitors sit out open play, which is how matchmaking knows who they are. It locks with the API's reason (`competitorsBlockedReason` on the view) once a tournament match has been played, or when teams were picked by hand.
- Tournament courts play bracket matches only; other courts keep open play. Players still in the tournament are held out of the open-play queue, lineups and roster removal until they're knocked out or it finishes (`heldPlayers`). Each open tournament court previews the exact match it starts next (`courtAssignments`), and auto-fill starts tournament matches whenever auto-fill is on, whatever the queueing mode. A tournament match must finish with a score.
- While a tournament exists, the session page has a Tournament tab (`TournamentPanel`): progress, publish and cancel, then `TournamentBoard` (champion, on court now, up next with Start buttons, brackets drawn as columns with connector lines, pool tables and rounds). Cancelling (or closing a finished one) returns its courts and players to open play; played matches stay on the leaderboard.
- The rules are pure TypeScript in `server/src/utils/tournament/`: `bracket.ts` (generation), `progress.ts` (byes and walkovers, results moving on, reset final, pools into knockout, standings, eliminations, champion), `teams.ts`, `play.ts` (tournament matches on courts), `setup.ts` (create, court switch, start, cancel) and `view.ts` (every label, such as "Quarterfinal 2" or "Winner of Semifinal 1"). The session engine calls into them. Draws use `EngineContext.random`, so tests are repeatable.
- The tournament is saved as one JSON document on the session (`sessions.tournament`) with each court's flag (`session_courts.tournament`), by `save_session`, so it shares the session's version. `save_session` only touches them when the save carries a `tournament` key: with `FEATURE_WEB_TOURNAMENTS=false` the API loads sessions without tournaments (courts play open play) and never erases one.
- Publishing gives an unguessable `/t/<slug>` link (`sessions.tournament_slug`; `POST`/`DELETE /api/sessions/:id/tournament/publish`). `PublicTournamentPage` reads `GET /api/public/tournaments/:slug` through the `security definer` function `public_tournament`, refreshes on its own and toasts new results. `FEATURE_WEB_TOURNAMENTS` gates the switch, tab and API; `FEATURE_WEB_PUBLISH_TOURNAMENTS` gates the publish button, the public route and endpoint.

# Leaderboard Requirements (Mandatory)
- One layout for the session's Leaderboard tab and the public leaderboard page (`components/leaderboard/LeaderboardBoard`). There is no banner above it (the spotlight banner was removed; the API still sends `spotlight`):
  - the top three on a podium, shown 2nd · 1st · 3rd, each card on a bar whose height shows the place, with gold, silver and bronze crowns (`podiumMedals` in `src/config/leaderboard.ts`; colours are the `gold`/`silver`/`bronze` theme tokens);
  - a table for everyone else (avatar, movement ▲/▼, played, streak, badges, W–L, +/−);
  - players on a hot streak (`hot-streak` badge: `leaderboardRules.hotStreak` wins in a row, decided by the API) get a "Hot streak · N" tag (`HotStreakTag`) with a dancing flame (`HotStreakIcon`) and rising embers. Their row or podium card is not otherwise styled. The tag replaces the badge chip, so it shows once. The flame and embers are CSS keyframes (`flame`, `ember` in `animations/animations.css`), coloured by the `fire`/`ember` theme tokens and timed by `motion.loops`. Under reduced motion the CSS is cut to one frame.
  - every other badge chip (`LeaderboardBadgeChip`) has its own colour, the `tone` in `leaderboardBadges` (`src/config/leaderboard.ts`), built from theme tokens.
  - badge chips and the hot-streak tag use drawn duotone SVG icons, not lucide: one component per badge in `components/leaderboard/badgeIcons/` (framed by `BadgeSvg`, typed `BadgeIcon` in `types/leaderboard.ts`), coloured by `currentColor` so each takes its chip's tone.
  - recent results.
- Every podium card and table row has a Share button (`components/leaderboard/share/PlayerShareButton`), on the session's Leaderboard tab and the public page. It opens `PlayerShareDialog` with images drawn in the browser on a canvas (`utils/share/renderCards.ts`): a summary card (place, record, every badge) and one card per badge the API gave the player. Sizes, wording (`badgeLine`) and layout are in `src/config/shareCards.ts`; colours are theme tokens (`color` in `leaderboardBadges`), each drawing sits on a light medal plate so every colour reads on the deep stage, and the drawings are the same shapes as the badge icons (`config/badgeArt.ts`, drawn by `BadgeSvg` and on the canvas). "Share" uses the device's share sheet where it can take files (`utils/share/shareImages.ts`); "Download" works everywhere. The public leaderboard link, when published, is printed on the cards and added to the share text.
- The API computes ranks, current win streaks (no-score matches don't break them), places moved in the latest match, badges and the spotlight (`server/src/utils/session/leaderboard.ts`). Badge thresholds are in `server/src/config/leaderboard.ts`. The web app only labels them: badge names and icons, podium heights and avatar colours are in `src/config/leaderboard.ts`.
- Motion (`animations/leaderboardMotion.ts`, `animations/useLiveRanking.ts`):
  - **Entrance:** podium bars grow, cards and rows rise, and win counts count up when the board scrolls into view.
  - **Ranking changes:** players slide to their new places with GSAP Flip, matched by `data-flip-id` (the player id), so a player can travel from the table onto the podium. Rows visibly switch: climbers are highlighted and pass in front (`.rank-rising`), fallers dim (`.rank-falling`), and rank numbers count from the old place to the new one.
  - **Only while watched:** changes animate only while the rankings are on screen and the tab is in front. Updates that arrive unseen wait, and play when the viewer comes back. Only the ranking area counts as watched, not recent results.
  - **Reduced motion:** shows updates at once, without animation.

# Website Design Requirements (Mandatory)
- The landing page follows the layout and motion language of ~/by-ian, without its 3D scene or custom cursor:
  - a floating glass pill nav with icons and one highlighted action;
  - a framed full-height hero on a mesh gradient;
  - very large, heavy, tightly tracked headlines with the key words in the bright tone;
  - mono eyebrows (`02 / ~/how-it-works`);
  - glass cards on deep sections;
  - a closing two-column section;
  - a dusk footer with a big wordmark.
  Colours stay Matchpoynt's (`config/theme.ts`: `deep`, `mesh-*`, `glass` tokens); reusable pieces are `@layer components` classes in `index.css` (`headline-xl`, `eyebrow-mono`, `glass-panel`, `frame-hero`, `section-deep`, `footer-dusk`).
- Landing motion, from by-ian:
  - **Splash** (`components/splash/Splash.tsx`, `animations/splashTimeline.ts`):
    - "Matchpoynt" rises into view with the tagline, then the hero's court-green panel wipes down on a wave and hands over to the page.
    - It plays once per browser session (sessionStorage), skips on any key or click, and is off with `FEATURE_WEB_SPLASH=false` or reduced motion.
    - It is portalled to `<body>` and locks scrolling while it plays.
  - **Hero** (`heroEntrance`): hidden while the splash plays, then the headline rides in on a wave and the rest rises after it.
  - **Sections** (`landingSection`): each heading waves in as it scrolls into view, and its cards rise in order.
  - **Sports strip** (`marquee`): loops endlessly and slows to a stop on hover or focus.
- The landing page includes a sign-in prompt: the closing section shows the sign-in card when signed out, a "welcome back" card when signed in, and a guest start when sign-in is off.
- Auth pages (sign in, sign up, complete profile, forgot and reset password) share `components/auth/AuthLayout`:
  - a full-bleed photo, darkened right and bottom for legibility;
  - the brand top-left;
  - the white form card on the right (centred on small screens);
  - the photo credit bottom-right.
  Each page uses a different photo from `config/authPhotos.ts`.
- Sign-in is email first, then password, with "Forgot password?" and "Email me a sign-in link instead" on the password step, and Google and Apple buttons (PNG logos in `public/brand/`) under an "Or" divider. Apple is off by default (`FEATURE_WEB_SIGN_IN_APPLE`) until its provider is set up in Firebase.
- Email sign-in links only sign in existing accounts (the API checks with `hasAccount` before sending, since a Firebase link would create one); accounts are created by the sign-up form, where the person chooses a password. The one exception is a club invite, whose link creates the account; the invite page then makes them fill in the sign-up form and choose their password. Anyone signed in (by link, Google or Apple) can set or change a password from the account menu (`/account/password`).
- Sign-in runs in the API against Firebase Auth (`routes/auth.ts`, `utils/firebase/identity.ts`), and the ID and refresh tokens live in httpOnly cookies (`mp_id`, `mp_refresh`; `utils/auth/session.ts`). Every request verifies the ID token against Google's keys (`verifyIdToken`, `jose`) and renews it from the refresh token when it expires.
- Google (and Apple) use Firebase's code flow: `GET /api/auth/oauth/:provider` calls `createAuthUri` and keeps Firebase's session id in a short-lived httpOnly cookie (`mp_oauth`); the provider returns to `/api/auth/callback`, which finishes with `signInWithIdp`. The OAuth client's Authorized redirect URIs (Google Cloud > Credentials, the client Firebase created) must list `APP_URL/api/auth/callback`.
- Every emailed Firebase link (sign-in link, email confirmation, password reset) ends at `/api/auth/action` (`actionUrl`, carrying `?next=` and, for sign-in links, the email). Firebase's action URL (Authentication > Templates > Customize action URL) is set to `APP_URL/api/auth/action`; `APP_URL`'s domain is in Firebase's Authorized domains. A reset link's code waits in an httpOnly cookie (`mp_reset`) until `POST /api/auth/reset-password`, so the browser never holds it.
- Supabase runs a Firebase token as `authenticated` only when it carries `role: authenticated`. `authorize` grants that custom claim once per account with the Firebase service account (`grantDatabaseRole` in `utils/firebase/admin.ts`, `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`, API only) and renews the token to include it.
- Photos are loaded by link, never bundled, and their licence credit is shown. Any external image host must be added to `img-src` in both `docker/proxy/nginx.conf` and `src-tauri/tauri.conf.json`.
- Giant headlines sit in grids with `minmax(0, 1fr)` tracks so they shrink to the screen instead of stretching the column. Check every page at 390px wide.

# Account Requirements (Mandatory)
- The profile lives in `profiles` and `player_sports` (a tier per sport). Columns are nullable on purpose: whether a profile is complete is decided by the API's required-field list (`server/src/utils/profile/rules.ts`), so adding a required field later sends existing users back to complete it.
- Sign-up is one multi-step form (`components/auth/signup/SignUpForm`): Account, About you, Sports, Finish. The same form without the Account step is the complete-profile form.
- When a sign-in expires, any 401 from outside `/api/auth` (`utils/api/authExpiry.ts`, wired into the query and mutation caches) marks the user signed out. `RequireSignIn` then sends them to `/sign-in?next=<page>&reason=expired`. Sign-in passes `next` on: in the password body, the email link body and the OAuth query. The API checks it against `returnPath` (`server/src/utils/auth/returnTo.ts`) and answers with `redirectTo`, so only allow-listed app pages can be returned to. `GET /api/sessions/active` answers 401 when sign-in is on and nobody is signed in, so an expired board is noticed.
- Anyone signed in with missing profile fields is sent to `/complete-profile`:
  - `RequireCompleteProfile` in the web app;
  - `requireCompleteProfile` in the API, so it can't be skipped;
  - the auth callback's redirect.
  Both the guard and the profile page decide from the same `me` query: two caches disagreeing caused a redirect loop.
- Sign-up saves the profile at once as the new account, then sends a confirmation email; password sign-in is refused (and the email re-sent) until it's confirmed. The link lands on `/sign-in?confirmed=1`.
- Sign-in links and sign-ins only return to allow-listed pages (`returnPath`: `/app`, `/app/past`, `/app/<session id>` and `/clubs/<club id>` (UUID only), `/invite/<token>`, `/clubs`, `/rankings`, `/account/password`, `/reset-password`, `/complete-profile`), so they can't redirect off-site.
- Forgot password gives the same answer whether or not the email has an account.
- Toggles: `FEATURE_WEB_SIGN_UP` and `FEATURE_WEB_PASSWORD_RESET` sit under `FEATURE_WEB_SIGN_IN`. Profile completion follows `FEATURE_WEB_SIGN_IN` alone, because signed-in people must be able to finish their profile even when new sign-ups are closed.

# Feedback Requirements (Mandatory)
- Toasts (shadcn `sonner`, mounted once in `App`) announce progress and completed changes, never failed API calls. They're coloured by kind (`richColors`, theme tokens mixed in oklab in `components/ui/sonner.tsx`): success green (`notifyDone`), info blue (`notifyChange`), warning amber (`notifyWarning`, e.g. a court over time), error red (styled, but errors go to banners).
  - Each action shows a loading toast that turns into its result in place, e.g. "Starting a match on Court 2…" becomes "Court 2: Ana & Cy vs Ben & Dee".
  - Changes the user didn't directly make are toasted too: auto-filled courts, new results on a public leaderboard, reconnecting.
  - Helpers live in `utils/feedback/notify.ts`; wording lives in `utils/feedback/sessionMessages.ts`.
- Banners (shadcn `Alert`, via `components/feedback/`) show states and errors that need to stay on screen.
  - `StatusBanner`: persistent states, e.g. offline or a background save.
  - `ErrorBanner`: every failed action or load, with:
    - what was being done ("Couldn't start a match on Court 2");
    - the exact cause from the API;
    - the fields at fault, if any;
    - what to do next;
    - a reference line with HTTP status, error code, method and path, and the API request id;
    - a Try again button whenever the action can be repeated.
  - `ConnectionBanner`, in both layouts: offline, or the API unreachable.
- Error text must say exactly what is wrong in the user's terms, never "Something went wrong" when the cause is known. It must never expose secrets, SQL or stack traces: the API maps internal errors to specific safe messages and logs the raw error under the request id.

# API Requirements (Mandatory)
- The API is Hono on Node in `server/`, mounted at `/api`. Routes live in `server/src/routes/`, one file per area (`auth.ts`, `sessions.ts`, `public.ts`, `config.ts`).
- Business logic is pure TypeScript in `server/src/utils/session/` (engine, matchmaking, scoring, setup, leaderboard, view). It takes state and an injected `EngineContext` (clock and id source) and returns new state, with no I/O. Every rule has Vitest tests in `test/unit/api/`, at the same path as the code (`server/src/utils/session/engine.ts` → `test/unit/api/utils/session/engine.test.ts`). Run them with `pnpm test:unit`.
- A request is handled in this order: Zod shape check (`utils/validation/schemas.ts`), load state (`queries/`), apply the engine, save, then return a view built by `utils/session/view.ts`.
- Rule violations throw `ApiError` (`invalid`, `conflict`, `not_found`, `unavailable`, …). Its message is written for the user and may carry `fields`. Zod failures name each bad field. Database and Auth failures are mapped to specific messages in `utils/supabase/errors.ts`, e.g. a missing migration, RLS denial, Supabase unreachable, or Supabase not trusting Firebase tokens. Firebase Auth failures are mapped in `utils/firebase/errors.ts` (`authFailure`), e.g. a provider turned off, a weak password or an expired link. Every response carries an `X-Request-Id`, and error bodies repeat it as `requestId`. Server-side logs include it, so a user's banner reference finds the log line. Unexpected errors become a 500 without details and are logged server-side only.
- The API never trusts client ids. Unknown court or player ids in a setup get fresh server UUIDs.
- Concurrency is optimistic. Every session change sends `If-Match: <version>`, and a stale version answers 409 so the client refetches.
- CSRF protection: state-changing requests must carry an `Origin` matching `APP_URL` (or `Sec-Fetch-Site: same-origin`), on top of `SameSite=Lax` cookies.
- Public, signed-out endpoints live under `/api/public/` and read only through narrowly scoped `security definer` functions (e.g. `public_leaderboard`). Published links use unguessable 128-bit slugs.
- `server/src/config/env.ts` validates required variables with Zod at startup and names any that are missing.
- The production build bundles the API, including `shared/` and all dependencies, into one file with esbuild, so the runtime image has no `node_modules`. Native modules are therefore out: photo conversion uses jSquash's WebAssembly codecs, whose `.wasm` files the build copies to `dist/wasm` (found next to the bundle in production, in `node_modules` in development). The bundle's `require` banner aliases `createRequire`, so source files may import it too.

# Backend Requirements (Supabase + Drizzle) (Mandatory)
- Supabase provides Postgres and Storage; Firebase provides Auth. Only the API talks to either.
- Supabase trusts Firebase through Third-party Auth (Authentication > Third-party Auth > Firebase, with the Firebase project id). An account id is the Firebase UID, the token's `sub`: owner columns are `text`, RLS compares them with `(select auth.jwt() ->> 'sub')` (`authUid` in `schema.ts`), and nothing references `auth.users`. Never use `auth.uid()`: it casts `sub` to uuid and fails for a Firebase UID.
- The API uses only the publishable (anon) key and runs each query as the signed-in user by sending their Firebase ID token as the access token (`supabaseAs` in `server/src/utils/supabase/client.ts`). RLS therefore applies to every request. The Supabase service-role key is not used anywhere: not in `server/`, not in a container, not in CI. The Firebase service account is used only by the API, only to grant the `role` claim and look up whether an email has an account.
- Signed-out reads (published leaderboards) use an anon client (`utils/supabase/anon.ts`) that can only call functions granted to `anon`.
- The schema lives in code in `server/src/db/schema.ts` (Drizzle `pgTable`, with `pgPolicy` and the `drizzle-orm/supabase` roles and helpers). Never change the schema from the Supabase dashboard.
- Migrations are generated, never hand-edited:
  - `pnpm db:generate` writes the next migration to `server/drizzle/` from the schema.
  - SQL the schema can't express (functions, grants) goes in a custom migration created with `pnpm --filter @matchpoynt/server db:migration <name>`.
  - `pnpm db:migrate` applies migrations using `DATABASE_URL`, which only migrations ever use.
  - CI fails if the schema changed without a migration.
- Row Level Security is on for every table, with policies defined next to the table in `schema.ts`. Authorization relies on RLS and API checks, never on hiding UI.
- Multi-table writes go through Postgres functions (`save_session`, `end_session`) so they happen in one transaction, with a version check. These functions are `security invoker`, so RLS still applies.
- `server/src/types/database.ts` types the supabase-js client. Regenerate it with `pnpm --filter @matchpoynt/server db:types` after migrating, and keep it in step with `schema.ts`.
- Every sport-scoped table queried across sessions (sessions, matches, rankings, seasons, fees, player tiers) has a `sport_id` column that matches a key in `shared/src/config/sports.ts`.

# Shared Package Requirements (Mandatory)
- `shared/` (`@matchpoynt/shared`) holds data and types used by both the web app and the API: sport rules, session defaults, feature defaults and env names, and request/response interfaces. It contains no logic and no React. A data constructor is fine; a rule is not.
- `shared/` is consumed as TypeScript source by Vite, tsx and esbuild. It has no build step.

# Multi-sport Requirements (Mandatory)
- Never hard-code a sport. Each sport's name, scoring formats (points to win, cap/deuce rules, singles/doubles), skill tiers and terminology live in `shared/src/config/sports.ts`, typed by `SportRules`. The web app's `config/sports.ts` adds only presentation (the icon) through `interfaces/Sport.ts`, which extends `SportRules`.
- UI copy uses sport-neutral words: court, match, game, player, session, queue. Sport-specific labels (e.g. "shuttle fee", "ball fee") come from the sport config.
- Sessions, rankings, seasons and fees are scoped per sport. A player can hold a different tier in each sport. A session is for one sport and cannot switch.

# Desktop App Requirements (Mandatory)
- The desktop app is Tauri v2 wrapping the same Vite build, with the Rust side in `src-tauri/`. Do not fork the UI for desktop: there is one `src/`. Platform differences sit behind `utils/platform/` (`isDesktop()`), and desktop features are toggled by `FEATURE_DESKTOP_*` through `/api/config`.
- Rust commands live in `src-tauri/src/commands/`, one file per concern (e.g. `storage.rs`, `updates.rs`), and are registered in `lib.rs`. Each command is declared in `build.rs` (`AppManifest`) so it is denied by default and granted explicitly in `src-tauri/capabilities/`. The frontend calls them only through typed wrappers in `utils/desktop/`, never `invoke()` directly from a component.
- Least privilege: grant only the Tauri permissions the app actually uses, in `src-tauri/capabilities/`. No wildcard filesystem, shell or HTTP scopes. Keep a strict CSP in `tauri.conf.json` and never load remote scripts into the webview.
- The desktop app calls the Matchpoynt API (never Supabase) through `@tauri-apps/plugin-http`, with its URL scope limited to the API's origin. This is the desktop counterpart of the nginx proxy rule. `utils/api/client.ts` gets the plugin's `fetch` through an adapter, so the same hooks run on both targets.
- Sign-in on desktop opens the system browser (`@tauri-apps/plugin-opener`) at the API's sign-in route and returns through a deep link (`@tauri-apps/plugin-deep-link`) carrying a one-time code. A Rust command exchanges the code with the API for a session token and stores it in the OS keychain. The webview never sees the token; Rust attaches it to API requests. Never run third-party sign-in inside the webview.
- The desktop app must work offline for Queue Masters, and the Rust side counts as server side. When offline:
  - The webview calls Rust commands instead of the API, and Rust runs an offline engine (`src-tauri/src/offline/`) that implements the same session rules as `server/src/utils/session/`.
  - Data goes to SQLite through Rust inside the app's data directory, and changes are queued with the session version.
  - Back online, Rust replays the queue to the API. The API's version check decides conflicts, and the server's state wins.
  - The webview runs no rules in either mode.
  - The Rust engine is tested against the same cases as the TypeScript engine. When a rule changes in one, change it in the other in the same commit.
- No secrets in the desktop bundle, because shipped binaries can be inspected. Per-user tokens go in the OS keychain behind a Rust command. Signing secrets (updater key, Apple and Windows code signing) exist only as CI secrets, never in the repo or in a committed `.env`.
- Updates ship through `@tauri-apps/plugin-updater` with signed artifacts. The updater public key lives in `tauri.conf.json`; the private key exists only in CI.
- One source of truth for identity. App name and version come from `package.json` and `config/site.ts`, and `tauri.conf.json` reads its version from `package.json`. The bundle identifier is reverse-domain and must not end in `.app` (e.g. `com.matchpoynt.desktop`). Icons are generated with `pnpm desktop:icons` from one source image (`public/favicon.svg`).
- Desktop builds run in CI on a macOS, Windows and Linux matrix with `pnpm tauri build`, not in Docker. Docker and Docker Compose remain the web and API delivery path only.
- Keep Vite compatible with `pnpm tauri dev`: fixed port with `strictPort`, `clearScreen: false`, and `TAURI_ENV_*` in `envPrefix`.
- git ignore `src-tauri/target/` and `src-tauri/gen/schemas/`; docker ignore all of `src-tauri/`.
- Rust code is formatted with `cargo fmt` and linted with `cargo clippy -- -D warnings`, and every command has unit tests (`cargo test`).


# CI Script Requirements
- Project scripts live in the root `scripts/` directory, never inside a package. Package `package.json` scripts call them by relative path (e.g. `node ../scripts/build-api.mjs`).
- Scripts should produce outputs in their own directories
- Every step should be logged with relevant emojis and timestamps
- Scripts that makes changes should have dry-run feature
- Loading bar or spinner is necessary when representing progress or wait

# Testing
- unit, integration, and end-to-end testing of the project is necessary
- write the UI test in playright, also consider delays like waiting the side to render or fetch data from the server before doing a change step in test.
- a dedicated script to run all test on after the other with configurable settings from arguements is necessary.
- Every test lives in the root `test/` directory, its own workspace package (`@matchpoynt/test`), never next to the code:
  - `test/unit/api/`: Vitest tests of the API's rules, mirroring `server/src/` paths. `@/` resolves to `server/src`, `@test/` to `test/unit/support/` (e.g. `@test/session` for the deterministic `EngineContext`). Config: `test/vitest.config.ts`.
  - `test/e2e/`: Playwright UI tests of the real web app (Vite dev server) against a mocked API (`e2e/support/mockApi.ts`), so they need no Supabase. The mock is an `auto` fixture, so hooks that only ask for `page` are covered too. Session routes run on the API's real rules in memory (`e2e/support/fakeSessions.ts`: the engine, setup, view, leaderboard and Zod schemas from `server/src`, in the same order as `routes/sessions.ts`), so setup, players, matches, settings and the leaderboard behave as they do against the real API. Club routes do the same (`e2e/support/fakeClubs.ts`: `utils/club/rules.ts`, `utils/club/badges.ts`, the schemas, `checkImage`/`checkBadgeIcon` and the real `toWebp` conversion); photos are kept in memory and served at `/api/media/...`. GIF search is faked (`fakeGifs`, tiny real GIFs; no GIPHY calls), and `api.sessions.assignClub(id, clubId)` runs a session in a club, as starting a planned session does. Seed clubs with `api.clubs.seed(club(...))`. Test photos are built in `e2e/support/images.ts` (`png`, `jpeg`, `notAnImage`), never committed as files. `e2e/session/tournament.spec.ts` plays a tournament to its champion, changes competitors on the board, and restarts a tournament match. `e2e/club/` covers club badges (GIF search and upload, conditions, edit and delete, refusals, reduced motion, earned on the leaderboard and on members), creating, editing and deleting clubs, profile and cover photos (upload, replace, remove, viewer, a fake image refused) and members (add, edit, remove, refused without a name). Session flows go through helpers in `e2e/support/session.ts` (`setUpSession`, `checkIn`, `finishMatch`, `standing`, …); never press Escape inside the setup dialog, it closes the dialog. `e2e/session/fullHouse.spec.ts` runs a full club night through the UI: 50 players across every tier on 4 courts, auto-fill, fair rotation between rounds and the leaderboard after every result. Only paths starting with `/api/` are mocked (a `**/api/**` glob also catches Vite's `src/utils/api/` modules); unknown API calls answer 404 and are recorded in `api.unhandled`. `*.mobile.spec.ts` runs at 390px (project `mobile`), everything else at 1440px (`desktop`). Config: `test/playwright.config.ts`, run with reduced motion so the splash and GSAP don't play. The browser window shows by default (headed); it's headless in CI or with `--headless`.
  - Let the page finish loading before each next step: open pages with `gotoReady`/`reloadReady` and call `pageReady(page)` after any click that navigates (`e2e/support/pageReady.ts`: load event, no requests in flight, no `aria-busy` region or shadcn `Skeleton` left). Then wait on what the user would see (`toBeVisible()`, `toHaveURL`, `toHaveAttribute`), never on fixed sleeps. With the window shown, every action is slowed by 1 s (`--slow-mo`) so it can be followed.
- `pnpm test` runs `scripts/test-all.mjs`: every suite in turn (`unit`, then `ui`), with `--only`, `--skip`, `--grep`, `--project`, `--headless`, `--slow-mo`, `--workers`, `--retries`, `--base-url`, `--install-browsers`, `--bail`, `--verbose` and `--dry-run` (`pnpm test --help`). Logs and `summary.json` go to `test/.output/runs/<timestamp>/`; Playwright's report and traces to that run's `ui/` folder (`UI_OUTPUT_DIR`), so runs at the same time don't clear each other's. `pnpm test:unit` and `pnpm test:ui` run one suite.
- The API image runs `test/unit` in its build stage; UI tests run in CI (`.github/workflows/web.yml`, job `ui`).