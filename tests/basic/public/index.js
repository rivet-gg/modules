/// <reference path="./dist/sdk.d.mts" />
import { Backend } from './dist/sdk.mjs';

const backend = new Backend({ endpoint: "http://localhost:6420" });

console.log('backend', backend);

window.findOrCreateLobby = async function() {
  const { lobby, players } = await backend.lobbies.findOrCreate({
    version: "TODO",
    regions: ["test"],
    tags: {"hello": "world"},
    players: [{}],

    createConfig: {
      region: "test",
      tags: {"hello": "world"},
      maxPlayers: 8,
      maxPlayersDirect: 8,
    },
  });

	// Test lobby connection
	while (true) {
    try {
      await connect(lobby, players);
      break;
    } catch (err) {
      console.warn('failed', err);
    }

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

  console.log('finished');
}

function connect(lobby, players) {
  return new Promise((resolve, reject) => {
    const port = lobby.backend.server.ports["game"];
    console.log('port', port);
    const ws = new WebSocket(`http://${port.publicHostname}?token=${players[0].token}`);
    ws.onopen = () => {
      console.log('open');
    };
    ws.onerror = err => {
      reject(err)
    };
    ws.onmessage = ev => {
      let [event, data] = JSON.parse(ev.data);
      if (event == 'init') {
        console.log('init', data)
        ws.send(JSON.stringify(["ping", 1]))
      } else if (event == 'pong') {
        console.log('pong');
        ws.close();
        resolve();
      } else if (event == 'stats') {
        // pass
      } else {
        console.warn('unknown event', event, data)
      }
    };
  });
}
