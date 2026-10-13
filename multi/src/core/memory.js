// In-memory connections, for tests and for a host who also plays on the same device. Messages go
// through JSON and arrive asynchronously, as they would over a network.
//
// Every connection kind gives the same two ends:
//   listener: { onconnection(conn) }               the host's side, one conn per player
//   conn:     { send(msg), close(), onmessage, onclose }

export function memoryPair() {
  const a = end();
  const b = end();
  a.peer = b;
  b.peer = a;
  return [a, b];
}

function end() {
  const conn = {
    open: true,
    onmessage: null,
    onclose: null,
    send(msg) {
      if (!conn.open) throw new Error('Connection closed');
      const data = JSON.stringify(msg);
      const peer = conn.peer;
      queueMicrotask(() => peer.open && peer.onmessage?.(JSON.parse(data)));
    },
    close() {
      for (const side of [conn, conn.peer]) {
        if (!side.open) continue;
        side.open = false;
        queueMicrotask(() => side.onclose?.());
      }
    },
  };
  return conn;
}

// A listener whose players connect with connect().
export function memoryListener() {
  const listener = {
    onconnection: null,
    connect() {
      const [host, player] = memoryPair();
      listener.onconnection?.(host);
      return player;
    },
  };
  return listener;
}
