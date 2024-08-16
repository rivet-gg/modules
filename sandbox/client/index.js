/// <reference path="./dist/sdk.d.mts" />
import { Backend } from './dist/sdk.mjs';

const urlParams = new URLSearchParams(window.location.search);
const environment = urlParams.get('env') || 'local';
// const API_ENDPOINT = environment === 'remote' ? "https://sandbox-brq--staging.backend.nathan16.gameinc.io" : "http://localhost:6420";
const API_ENDPOINT = environment === 'remote' ? "https://unity-demo-c8y.backend.nathan16.gameinc.io" : "http://localhost:6420";

const backend = new Backend({ endpoint: API_ENDPOINT });

console.log('backend', backend);

window.fetchState = async function() {
  const { state } = await backend.lobbies.fetchLobbyManagerState({});
  console.log('State', state);
};

window.resetState = async function() {
  await backend.lobbies.resetLobbyManagerState({});
};

window.findOrCreateLobby = async function() {
  let res;
  if (environment == 'local') {
    res = await backend.lobbies.findOrCreate({
      version: "default",
      regions: ["local"],
      tags: {},
      players: [{}],

      createConfig: {
        region: "local",
        tags: {},
        maxPlayers: 8,
        maxPlayersDirect: 8,
      },
    });
  } else {
		const region = "atl";
		const tags = {"foo": "bar"};
    res = await backend.lobbies.findOrCreate({
      version: "2024.08.14-4",
      regions: [region],
      tags,
      players: [{}],

      createConfig: {
        region,
        tags,
        maxPlayers: 8,
        maxPlayersDirect: 8,
      },
    });
  }

  let { lobby, players } = res;

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
    let protocol;
    let hostname;
    let port;
    if (lobby.backend.server) {
      protocol = lobby.backend.server.ports["game"].protocol;
      hostname = lobby.backend.server.ports["game"].publicHostname;
      port = lobby.backend.server.ports["game"].publicPort;
    } else if (lobby.backend.localDevelopment) {
      protocol = "http";
      hostname = lobby.backend.localDevelopment.ports["game"].hostname;
      port = lobby.backend.localDevelopment.ports["game"].port;
    } else {
      throw new Error("unknown backend");
    }

    console.log('connecting to', port);

    const ws = new WebSocket(`${protocol}://${hostname}:${port}?token=${players[0].token}`);
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
