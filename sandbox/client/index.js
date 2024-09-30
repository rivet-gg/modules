/// <reference path="./sdk/index.d.mts" />
import { Rivet } from './sdk/index.mjs';

const urlParams = new URLSearchParams(window.location.search);

function getBackend() {
  return new Rivet({ endpoint: localStorage.endpoint });
}

window.fetchState = async function() {
  const { state } = await getBackend().lobbies.fetchLobbyManagerState({
    adminToken: localStorage.adminToken
  });
  console.log('State', state);
};

window.resetState = async function() {
  await getBackend().lobbies.resetLobbyManagerState({
    adminToken: localStorage.adminToken
  });
};

window.setEndpoint = function() {
  localStorage.endpoint = prompt("Endpoint", localStorage.endpoint);
};

window.setAdminToken = function() {
  localStorage.adminToken = prompt("Admin token", localStorage.adminToken);
};

window.setGameVersion = function() {
  localStorage.gameVersion = prompt("Game version", localStorage.gameVersion);
};

window.findOrCreateLobby = async function() {
  const regions = await getBackend().lobbies.listRegions({});

  // const region = regions.regions[0].slug;
  const region = 'lnd-atl';
  const tags = {};
  let res = await getBackend().lobbies.findOrCreate({
    version: localStorage.gameVersion ?? "default",
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

