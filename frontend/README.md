# SyncSpace Web

Next.js (App Router) + TypeScript + Tailwind CSS + Redux Toolkit frontend for the SyncSpace API.

## Run it

```bash
cp .env.example .env.local   # point at your API
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` | REST base URL |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5000` | Socket.IO server |

On the API side set `CLIENT_URL=http://localhost:3000` (CORS + Socket.IO origin).
This project expects the patched backend (user search, populated senders, attachments, `channel` on notifications).

`npm run build` · `npm run lint`

## How data flows

Everything lives in one Redux store; components only read from it and dispatch.

```
components ──dispatch──▶ thunks (src/store/slices/*) ──▶ api() ──▶ REST
     ▲                                                              │
     └──────── useAppSelector ◀──── reducers ◀─────────────────────┘
                                        ▲
Socket.IO ──▶ src/store/socketHandlers.ts (event → action) ─────────┘
```

| Slice | Holds |
| --- | --- |
| `auth` | user, token, session status |
| `workspaces` | workspaces, members per workspace |
| `teams` | teams per workspace (`isMember` / `myRole`), team rosters |
| `channels` | channels per team, private-channel rosters |
| `messages` | messages per channel (oldest→newest, paginated), search results |
| `dm` | conversations and direct messages |
| `notifications` | activity feed (invites / system) |
| `unread` | unread count per channel, unread notification ids per DM |
| `presence` | online users, who is typing where |
| `files` | workspace files, composer attachments waiting to be sent |
| `ui` | toasts, mobile sidebar, active chat, socket status |

Notes:

* `src/lib/api.ts` unwraps the `{success, message, data}` envelope and normalises `_id` → `id`, so the app only ever sees `id`.
* Messages are de-duplicated by id: the REST response and the socket echo of the same message are both applied safely.
* The socket joins the room of whichever chat is active (`ui.activeChat`) and re-joins after reconnects.
* Channel unread badges come from `GET /unread-counts` plus live `notification:new` events; chat notifications are folded into those counters instead of being listed.
* Signing out dispatches `auth/loggedOut`, which resets every slice.
* Auth: JWT in `localStorage`, mirrored to a cookie so `src/proxy.ts` (Next 16's middleware) can redirect signed-out visitors. Any API 401 signs the user out.

## Routes

`/login` · `/register` · `/onboarding` · `/w/[workspaceId]` (home) · `/c/[channelId]` · `/dm/[conversationId]` · `/teams/[teamId]` · `/members` · `/files` · `/notifications`
