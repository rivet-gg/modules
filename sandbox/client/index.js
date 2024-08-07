/// <reference path="./dist/sdk.d.mts" />
import { Backend } from './dist/sdk.mjs';

const urlParams = new URLSearchParams(window.location.search);
const environment = urlParams.get('env') || 'local';
const API_ENDPOINT = environment === 'remote' ? "https://sandbox-back-vlk--staging.backend.nathan16.gameinc.io" : "http://localhost:6420";

const backend = new Backend({ endpoint: API_ENDPOINT });

console.log('backend', backend);

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
      version: "95cbad73-dcfd-4a74-96de-799b8ddc1b72",
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
    let hostname;
    let port;
    if (lobby.backend.server) {
      port = lobby.backend.server.ports["game"];
    } else if (lobby.backend.localDevelopment) {
      port = lobby.backend.localDevelopment.ports["game"];
    } else {
      throw new Error("unknown backend");
    }

    console.log('connecting to', port);

    const ws = new WebSocket(`${port.isTls ? "wss" : "ws"}://${port.hostname}:${port.port}?token=${players[0].token}`);
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
