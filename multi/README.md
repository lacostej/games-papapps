# Play together (proof of concept)

Several devices play the same numbers round. One device hosts and can play too; the others join by scanning its QR code. No server: the devices talk to each other over WebRTC on the local network.

## Layers

| Layer | Files | Knows about |
|---|---|---|
| Games | `src/games/` | one game's rules: `defaults`, `phases(options)`, `deal(options, random)`, `check(deal, answer)`, `summary(deal)` |
| Session | `src/core/session.js` | players, series, clock, scores. `Host` decides everything; `Player` sends its name and answers |
| Connection | `src/core/memory.js`, `src/net/lan.js` | moving JSON messages. Both give a listener with `onconnection(conn)` and conns with `send`, `close`, `onmessage`, `onclose` |
| Page | `src/ui/` | screens, QR codes, the camera |

The host sends its whole public state after every change, so a player who rejoins is up to date at once. Each device keeps a random id in `localStorage`; joining again with the same id takes back the same seat and score.

A series is a list such as `[{ game: 'numbers', options: { level: 'kids', think: 30, answer: 45 } }, …]`. Mixing games means adding a module to `src/games/` and its screen to the page.

A connection over the internet would be one more file next to `lan.js`, for example a WebSocket relay giving the same listener and conn shape. Nothing above it changes.

## Joining

1. The host's screen shows an invite QR code: a link to this page carrying a WebRTC offer.
2. The player scans it with the phone's camera app. The page opens and shows a reply QR code.
3. The host scans the reply with *Scan a reply*, or pastes it. The connection opens and the player is in.

Each invite works once; the host's screen then shows a new one. *Invite* stays available during the game to add players. When a player drops out mid-game, the host's invite opens by itself, naming who left, and closes once everyone is back.

## Trying it

- Locally: `npm start` prints a `localhost` URL for hosting from this computer. Browsers allow the camera only on https or localhost, and `?base=` makes the invite link point at the computer's network address. Phones join by scanning it; they don't need the page's camera.
- The published site is https, so any device can host there.
- `?ice=stun:host:port` adds an ICE server. By default only the local network is tried.

## Checked so far

- `npm test`: sessions over in-memory connections, covering a full series, the clock, early end, a dropped player rejoining, removal, and replaying numbers moves.
- Headless Chrome, two isolated browser profiles on one machine, over real WebRTC: connect, play a round, see results, drop out and rejoin into the next round. With camera permission the host's code carries its real address and the player's a `.local` name, and they connect. Without it, both carry `.local` names, and one of three runs failed to connect.
- Firefox 157, headless with a fake camera: an invite offered only a `.local` name with no camera, with the camera running, and after it stopped. So a Firefox host can't reveal its address. On a real network, a Firefox host and a phone failed with `.local` names on both sides.
- Real devices on the home Wi-Fi: Chrome on a Mac (localhost host, camera allowed) and Chrome on a phone connected, with real addresses on both sides. With Firefox as the phone's browser and the same Chrome host, one attempt never opened: the host went `checking 0s → disconnected 15s`, and the phone stayed on `checking` although it had the host's real address. A later attempt connected. So a Firefox guest can work, but not reliably yet.
- Both screens show a status line during joining, e.g. `checking 0s → connected 2s · here: 192.168.1.39 · there: <name>.local`: the connection states with their timing, and each side's addresses.

## Open questions, in order

1. Do real phones on the home Wi-Fi connect? This depends on `.local` names resolving between devices (see above), and on the router not isolating devices from each other. It is the first thing to try, including iPhone ↔ Android.
2. Codes are about 600 characters, which makes dense QR codes. If phones struggle to scan them, keep only the parts of the offer WebRTC needs.
3. Reloading the host's page ends the session.
