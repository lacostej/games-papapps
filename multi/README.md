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

Where the page may use the camera (https or localhost), a player can also scan the invite from the page itself: *Scan the host's code* on the start page, and on the message shown when the connection drops.

Each invite works once; the host's screen then shows a new one. *Invite* stays available during the game to add players. When a player drops out mid-game, the host's invite opens by itself, naming who left, and closes once everyone is back.

## Trying it

- Locally: `npm start` prints a `localhost` URL for hosting from this computer. Browsers allow the camera only on https or localhost, and `?base=` makes the invite link point at the computer's network address. Phones join by scanning it; they don't need the page's camera.
- The published site is https, so any device can host there.
- `?ice=stun:host:port` adds an ICE server. By default only the local network is tried.

## Hidden addresses

Browsers replace a device's local address with a random `.local` name in what WebRTC shares with a page, so that sites can't read it to track visitors. The other device must look that name up on the Wi-Fi (multicast DNS), and this is where LAN connections fail.

- The exception: a page that may use the camera or microphone gets the real address. Chrome exempts sites "that have getUserMedia permissions, which are presumed to have a higher degree of user trust" ([announcement](https://groups.google.com/g/discuss-webrtc/c/6stQXi72BEU/m/2FwZd24UAQAJ)), and [RFC 8828](https://www.rfc-editor.org/rfc/rfc8828.html) suggests tying the consent to expose all addresses to that permission. It is a trust heuristic, not a security boundary: a site that may see the camera already sees more than a local address.
- Firefox applies the same exception, but only while the page is capturing or holds a remembered permission (`IsActivelyCapturingOrHasAPermission` in `dom/media/MediaManager.cpp`, used by `GetPrefObfuscateHostAddresses` in `PeerConnectionImpl.cpp`). A one-time *Allow* stops counting once the camera is off, so the host keeps the camera running while each invite gathers its addresses (`LanListener.reveal`).
- One side's real address is enough: the other side sends its checks there and is answered. With `.local` names on both sides, both lookups must work, and Firefox has open bugs there: it answers lookups for its own names only once the connection setup is complete ([1691189](https://bugzilla.mozilla.org/show_bug.cgi?id=1691189)), and LAN connections with Firefox on one side fail unless hiding is turned off ([1698141](https://bugzilla.mozilla.org/show_bug.cgi?id=1698141)). The pref `media.peerconnection.ice.obfuscate_host_addresses` turns hiding off on desktop; Firefox for Android has no `about:config`.
- Beyond the LAN, a STUN server (`?ice=`) adds the router's public address, which browsers don't hide; two devices behind the same router then connect only if it passes that traffic back inside. A relay works always but needs a server.

## Checked so far

- `npm test`: sessions over in-memory connections, covering a full series, the clock, early end, a dropped player rejoining, removal, and replaying numbers moves.
- Headless Chrome, two isolated browser profiles on one machine, over real WebRTC: connect, play a round, see results, drop out and rejoin into the next round, including by scanning from the page with a fake camera. With camera permission the host's code carries its real address and the player's a `.local` name; 26 of 27 runs connected. Without it, both carry `.local` names, and one of three runs failed to connect.
- Real devices on the home Wi-Fi:
  - Chrome host on a Mac (localhost, camera allowed) with a Chrome phone: connected, real addresses on both sides.
  - Same host with a Firefox phone: one attempt never opened (host `checking 0s → disconnected 15s`, phone stuck on `checking` with the host's real address), a later one connected.
  - Firefox host on the Mac with a Firefox phone, camera turned off right after the one-time *Allow*: `.local` names on both sides, `failed` after 5 s. With *Remember for all cameras* ticked: the host showed its real address and they connected.
- Firefox 157 headless with a fake camera and `media.navigator.permission.disabled` kept the address hidden even while capturing, contradicting the source above; that setup probably doesn't count as capturing. Real devices are the reference.
- Both screens show a status line during joining, e.g. `checking 0s → connected 2s · here: 192.168.1.39 · there: <name>.local`: the connection states with their timing, and each side's addresses.

## Open questions, in order

1. Does a Firefox host with a one-time *Allow* now connect, with the camera kept on while each invite is made? Does Firefox ask again for each invite?
2. iPhone ↔ Android, and routers that isolate devices from each other.
3. Codes are about 600 characters, which makes dense QR codes. If phones struggle to scan them, keep only the parts of the offer WebRTC needs.
4. Reloading the host's page ends the session.
