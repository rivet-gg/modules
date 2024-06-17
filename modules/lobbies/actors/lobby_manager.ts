import {
	ActorBase,
	ActorContext,
	RuntimeError,
	UnreachableError,
  __EXPERIMENTAL,
} from "../module.gen.ts";
import { createNanoEvents } from "https://esm.sh/nanoevents@9.0.0";
import { LobbyConfig } from "../config.ts";
import {
	CreateServerPortRequest as RivetCreateServerPortRequest,
	CreateServerRequest as RivetCreateServerRequest,
	CreateServerResponse as RivetCreateServerResponse,
	GetServerResponse as RivetGetServerResponse,
} from "../utils/rivet/endpoints.ts";
import { Server as RivetServer } from "../utils/rivet/types.ts";
import {
LobbyBackend,
	LobbyBackendResponse,
	LobbyResponse,
	LobbyState,
	lobbyTagsMatch,
} from "../utils/lobby/mod.ts";
import { PlayerResponse, PlayerState } from "../utils/player.ts";
import { canMutateLobbies, getLobbyConfig, requiresLobbyToken, canCallLobbyReadyMultipleTimes } from "../utils/lobby_config.ts";
import { LobbyBackendLocalDevelopmentPort } from "../utils/lobby/backend/local_development.ts";
import { LobbyBackendServerPortResponse } from "../utils/lobby/backend/server.ts";
import { regionsForBackend } from "../utils/region.ts";

const GC_INTERVAL = 15 * 1000;

type Input = undefined;

interface State {
	lobbies: Record<string, LobbyState>;
	servers: Record<string, Server>;
}

interface Server {
	id: string;
	createdAt: number;
	createFinishedAt?: number;
	data?: RivetServer;
}

const EVENT_KEYS = {
	lobbyUpdate(lobbyId: string): string {
		return `lobby.ready.${lobbyId}`;
	},
};

// TODO: Document why we make everything sync in this actor and use background jobs

export class Actor extends ActorBase<Input, State> {
	private emitter = createNanoEvents();

	initialize(ctx: ActorContext) {
		this.schedule.after(GC_INTERVAL, "gc", undefined);

    // TODO: This doesn't handle lobbyRules correctly
    // Create default lobbies if needed
    const lobbies: Record<string, LobbyState> = {};
    if ("localDevelopment" in ctx.config.lobbies.backend) {
      const devConfig = ctx.config.lobbies.backend.localDevelopment;
      const localLobbyId = "00000000-0000-0000-0000-000000000000";

      const ports: Record<string, LobbyBackendLocalDevelopmentPort> = {};
      for (const [portName, port] of Object.entries(devConfig.ports)) {
        ports[portName] = {
          protocol: port.protocol,
          hostname: port.hostname ?? "127.0.0.1",
          port: port.port,
        }
      };

      lobbies[localLobbyId] ={
        id: localLobbyId,
        version: devConfig.version ?? "default",
        region: "local",
        tags: devConfig.tags ?? {},
        createdAt: Date.now(),
        readyAt: Date.now(),
        emptyAt: Date.now(),
        players: {},
        maxPlayers: devConfig.maxPlayers ?? 32,
        maxPlayersDirect: devConfig.maxPlayersDirect ?? 32,
        backend: {
          localDevelopment: { ports }
        },
      }; 
    }

		return {
			lobbies,
			servers: {},
		};
	}

	// MARK: RPC
	public async rpcCreateLobby(
		ctx: ActorContext,
		req: CreateLobbyRequest,
	): Promise<CreateLobbyResponse> {
		const { lobbyId, playerIds } = this.createLobby(ctx, req);
		if (!req.noWait) await this.waitForLobbyReady(ctx, lobbyId);
		return {
			lobby: this.buildLobbyResponse(ctx, lobbyId),
			players: this.buildPlayersResponse(lobbyId, playerIds),
		};
	}

	public async rpcFindLobby(
		ctx: ActorContext,
		req: FindLobbyRequest,
	): Promise<FindLobbyResponse> {
		const { lobbyId, playerIds } = this.findLobby(ctx, req);
		if (!req.noWait) await this.waitForLobbyReady(ctx, lobbyId);
		return {
			lobby: this.buildLobbyResponse(ctx, lobbyId),
			players: this.buildPlayersResponse(lobbyId, playerIds),
		};
	}

	public async rpcFindOrCreateLobby(
		ctx: ActorContext,
		req: FindOrCreateLobbyRequest,
	): Promise<FindOrCreateLobbyResponse> {
		const { lobbyId, playerIds } = this.findOrCreateLobby(ctx, req);
		if (!req.noWait) await this.waitForLobbyReady(ctx, lobbyId);
		return {
			lobby: this.buildLobbyResponse(ctx, lobbyId),
			players: this.buildPlayersResponse(lobbyId, playerIds),
		};
	}

	public async rpcJoinLobby(
		ctx: ActorContext,
		req: JoinLobbyRequest,
	): Promise<JoinLobbyResponse> {
		const { playerIds } = this.createPlayers(ctx, req);
		if (!req.noWait) await this.waitForLobbyReady(ctx, req.lobbyId);
		return {
			lobby: this.buildLobbyResponse(ctx, req.lobbyId),
			players: this.buildPlayersResponse(req.lobbyId, playerIds),
		};
	}

	public rpcSetLobbyReady(ctx: ActorContext, req: SetLobbyReadyRequest) {
		this.setLobbyReady(ctx, req);
	}

	public rpcDestroyPlayers(
		ctx: ActorContext,
		req: DestroyPlayersRequest,
	) {
		this.destroyPlayers(ctx, req);
	}

	public rpcSetPlayersConnected(
		ctx: ActorContext,
		req: SetPlayersConnectedRequest,
	) {
		this.setPlayersConnected(ctx, req);
	}

	public rpcDestroyLobby(ctx: ActorContext, req: DestroyLobbyRequest) {
		this.destroyLobby(ctx, req);
	}

	public rpcListLobbies(
		ctx: ActorContext,
		_req: ListLobbiesRequest,
	): ListLobbiesResponse {
		return {
			lobbies: Object.keys(this.state.lobbies).map((x) =>
				this.buildLobbyResponse(ctx, x)
			),
		};
	}

	// MARK: Lobby
	private createLobby(
		ctx: ActorContext,
		req: CreateLobbyRequest,
	): { lobbyId: string; playerIds: string[] } {
		const lobbyConfig = getLobbyConfig(ctx.config, req.lobby.tags ?? {});

    // Check lobby can be created
    if (!canMutateLobbies(lobbyConfig)) throw new RuntimeError("cannot_mutate_lobbies");

		if (req.players.length > req.lobby.maxPlayers) {
			throw new RuntimeError("more_players_than_max");
		}

		if (
			lobbyConfig.destroyOnEmptyAfter != undefined &&
			(!req.players.length || req.players.length == 0)
		) {
			throw new RuntimeError("lobby_create_missing_players");
		}

    // Valiadte region
    const validRegions = regionsForBackend(lobbyConfig.backend);
    if (validRegions.findIndex(x => x.id == req.lobby.region) == -1) {
      throw new RuntimeError("region_not_found", {
        meta: { region: req.lobby.region }
      });
    }

    // Create backend
    let backend: LobbyBackend;
    if ("test" in lobbyConfig.backend) {
      backend = { test: {} };
    } else if ("localDevelopment" in lobbyConfig.backend) {
      throw new UnreachableError(undefined as never)
    } else if ("server" in lobbyConfig.backend) {
      // Create backend
      const serverId = crypto.randomUUID();
      backend = {
				server: { serverId },
			};

      // Add server
      const server: Server = { id: serverId, createdAt: Date.now() };
      this.state.servers[server.id] = server;
    } else {
      throw new UnreachableError(lobbyConfig.backend);
    }

		// Create lobby
		const lobby: LobbyState = {
			id: req.lobby.lobbyId,
			version: req.lobby.version,
      region: req.lobby.region,
			tags: req.lobby.tags ?? {},
			createdAt: Date.now(),
			emptyAt: Date.now(),
			players: {},
			maxPlayers: req.lobby.maxPlayers,
			maxPlayersDirect: req.lobby.maxPlayersDirect,
			backend,
		};
		this.state.lobbies[lobby.id] = lobby;

		// Create players
		const { playerIds } = this.createPlayers(ctx, {
			lobbyId: lobby.id,
			players: req.players,
			noWait: true,
		});

		// Run background job
		//
		// This is because both requests finding & joining this lobby need to
		// wait for the background job to finish before returning.
    if ("server" in backend) {
      this.runInBackground(
        ctx,
        this.createLobbyBackground(ctx, lobby, lobbyConfig, backend.server.serverId),
      );
    }

		return { lobbyId: lobby.id, playerIds };
	}

	private async waitForLobbyReady(_ctx: ActorContext, lobbyId: string): Promise<LobbyState> {
    // Check the lobby state
    const { status, lobby: newLobby } = this.getLobbyStatus(lobbyId);
    switch (status) {
      case "unready":
        // Do nothing
        break;
      case "ready":
        return newLobby!;
      case "cancelled":
        throw new RuntimeError("lobby_cancelled")
      default:
        throw new UnreachableError(status);
    }

		// Wait for lobby to be ready
		//
		// If the lobby is never ready, it will time out from the GC destroying the
		// lobby.
		return await new Promise((resolve, reject) => {
			// Wait for lobby ready
			const unsubscribe = this.emitter.on(
				EVENT_KEYS.lobbyUpdate(lobbyId),
				() => {
					const { status, lobby: newLobby } = this.getLobbyStatus(lobbyId);
					switch (status) {
						case "unready":
							// Do nothing
							break;
						case "ready":
							unsubscribe();
							resolve(newLobby!);
							break;
						case "cancelled":
							unsubscribe();
							// TODO: Error type
							reject();
							break;
						default:
							throw new UnreachableError(status);
					}
				},
			);
		});
	}

	/**
	 * The state of the server.
	 */
	private getLobbyStatus(
		lobbyId: string,
	): { status: "unready" | "ready" | "cancelled"; lobby?: LobbyState } {
		const lobby = this.state.lobbies[lobbyId];
		if (!lobby) {
			return { status: "cancelled" };
		} else if (lobby.readyAt) {
			return { status: this.getLobbyBackendStatus(lobby), lobby };
		} else {
			return { status: "unready", lobby };
		}
	}

	/**
	 * If the lobby backend is ready for players to start connecting.
	 */
	private getLobbyBackendStatus(
		lobby: LobbyState,
	): "unready" | "ready" | "cancelled" {
		if ("test" in lobby.backend) {
			return "ready";
		} else if ("localDevelopment" in lobby.backend) {
			return "ready";
		} else if ("server" in lobby.backend) {
			const server = this.state.servers[lobby.backend.server.serverId];
			if (server?.createFinishedAt) {
				return "ready";
			} else {
				return "unready";
			}
		} else {
			throw new UnreachableError(lobby.backend);
		}
	}

	private buildLobbyResponse(_ctx: ActorContext, lobbyId: string): LobbyResponse {
		const lobby = this.getLobby(lobbyId);

		let backend: LobbyBackendResponse;
		if ("test" in lobby.backend) {
			backend = { test: {} };
		} else if ("localDevelopment" in lobby.backend) {
			backend = {
				localDevelopment: {
					ports: lobby.backend.localDevelopment.ports,
				},
			};
		} else if ("server" in lobby.backend) {
			const server = this.state.servers[lobby.backend.server.serverId];
			if (!server) throw new Error("server not found");

			const serverData = server.data;
			if (serverData) {
				const ports: Record<string, LobbyBackendServerPortResponse> = {};
				for (const [k, v] of Object.entries(serverData.network.ports)) {
					ports[k] = {
						protocol: v.protocol,
						internalPort: v.server_port,
						publicHostname: v.public_hostname,
						publicPort: v.public_port,
						routing: v.routing,
					};
				}

				backend = {
					server: {
						serverId: lobby.backend.server.serverId,
						ports,
					},
				};
			} else {
				backend = {
					server: {
						serverId: lobby.backend.server.serverId,
						ports: {},
					},
				};
			}
		} else {
			throw new UnreachableError(lobby.backend);
		}

		return {
			id: lobby.id,
			version: lobby.version,
			tags: lobby.tags,
			createdAt: lobby.createdAt,
			readyAt: lobby.readyAt,
			players: Object.keys(lobby.players).length,
			maxPlayers: lobby.maxPlayers,
			maxPlayersDirect: lobby.maxPlayersDirect,
			backend,
		};
	}

	private buildPlayersResponse(
		_lobbyId: string,
		playerIds: string[],
	): PlayerResponse[] {
		return playerIds.map((id) => ({ id }));
	}

	private async createLobbyBackground(
		ctx: ActorContext,
		lobby: LobbyState,
		lobbyConfig: LobbyConfig,
		serverId: string,
	) {
		// TODO: Race condition with publishign & deleting lobby if delete request gets processed first

		const token = await this.createLobbyToken(ctx, lobby.id);

		if (!("server" in lobbyConfig.backend)) return;

		// Build tags
		const tags: Record<string, string> = {
      // TODO: backend/environment
      "opengb/lobbies/lobby_id": lobby.id,
      "opengb/lobbies/version": lobby.version,
    };
		for (const [k, v] of Object.entries(lobby.tags)) {
			tags[`opengb/lobbies/tags/${k}`] = v;
		}

		// Build ports
		const ports: Record<string, RivetCreateServerPortRequest> = {};
		for (const [k, v] of Object.entries(lobbyConfig.backend.server.ports)) {
			ports[k] = {
				protocol: v.protocol,
				internal_port: v.internalPort,
				routing: v.routing,
			};
		}

		const request: RivetCreateServerRequest = {
			datacenter: lobby.region,
			// TODO:
			tags,
      // TODO: Switch to querying builds
			image_id: lobby.version,
			arguments: lobbyConfig.backend.server.arguments,
			environment: Object.assign({}, lobbyConfig.backend.server.environment, {
        "LOBBY_ID": lobby.id,
				"LOBBY_VERSION": lobby.version,
				"LOBBY_TOKEN": token,
				"BACKEND_ENDPOINT": ctx.runtime.publicEndpoint,
			}),
			network: {
				mode: lobbyConfig.backend.server.networkMode,
				ports,
			},
			resources: lobbyConfig.backend.server.resources,
		};
		// TODO: Handle fail
    var createRivetServer;
    try {
      const { body: { server } } = await ctx.modules.rivet
        .call({
          method: "POST",
          path: "/servers",
          body: request,
        }) as { body: RivetCreateServerResponse };
      createRivetServer = server;
      ctx.log.info("created server", [
        "server",
        JSON.stringify(server),
      ]);
    } catch (err) {
      ctx.log.warn('failed to create server, destroying lobby', ...__EXPERIMENTAL.Log.errorToLogEntries('error', err));
      this.destroyLobby(ctx, { lobbyId: lobby.id });
      return;
    }

		// Update server state
		const server = this.state.servers[serverId];
		if (server) {
			server.data = createRivetServer;

			// TODO: Remove this
			server.createFinishedAt = Date.now();
		}

		this.emitter.emit(EVENT_KEYS.lobbyUpdate(lobby.id));

		// TODO: Replace with webhooks
		// HACK: Poll for lobby ready
		while (true) {
			const { body: { server: getRivetServer } } = await ctx.modules.rivet.call(
				{
					method: "GET",
					path: `/servers/servers/${createRivetServer.server_id}`,
				},
			) as { body: RivetGetServerResponse };

			if (getRivetServer.destroy_ts) {
				ctx.log.warn("server destroyed before ready");
			  this.destroyLobby(ctx, { lobbyId: lobby.id });
				break;
			}

			// Check if server can be connected to
			const isConnectable =
				Object.keys(getRivetServer.network.ports).length == 0 ||
				Object.values(getRivetServer.network.ports).filter((x) =>
						x.public_hostname
					).length == Object.keys(getRivetServer.network.ports).length;
			if (isConnectable) {
				ctx.log.info("server is connectable");

				// Save server data
				const server = this.state.servers[serverId];
				if (server) {
					server.data = getRivetServer;
					server.createFinishedAt = Date.now();
					await this.forceSaveState();
				}

				this.emitter.emit(EVENT_KEYS.lobbyUpdate(lobby.id));

				break;
			} else {
				ctx.log.info("server not connectable yet");

				// Wait
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}
	}

	private async createLobbyToken(
		ctx: ActorContext,
		lobbyId: string,
	): Promise<string> {
		const { token: token } = await ctx.modules.tokens.create({
			type: "lobby",
			meta: { lobbyId },
		});
		return token.token;
	}

	private destroyLobby(ctx: ActorContext, req: DestroyLobbyRequest) {
    // Get lobby
		const lobby = this.state.lobbies[req.lobbyId];
		if (!lobby) {
			throw new RuntimeError("lobby_not_found", {
				meta: { lobbyId: req.lobbyId },
			});
		}

    // Check can be deleted
    const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);
    if (!canMutateLobbies(lobbyConfig)) throw new RuntimeError("cannot_mutate_lobbies");

    // Remove lobby
		delete this.state.lobbies[req.lobbyId];

		// TODO: Optimize
		// TODO: Handle backends better
		if ("test" in lobby.backend || "localDevelopment" in lobby.backend) {
			// Do nothing
		} else if ("server" in lobby.backend) {
			const serverId = lobby.backend.server.serverId;

			// Delete server
			const didDeleteServer = delete this.state.servers[serverId];
			if (didDeleteServer) {
				this.runInBackground(ctx, this.destroyLobbyBackground(ctx, serverId));
			} else {
				ctx.log.warn(
					"did not find server to delete",
					["serverId", serverId],
				);
			}
		} else {
			throw new UnreachableError(lobby.backend);
		}

		this.emitter.emit(EVENT_KEYS.lobbyUpdate(req.lobbyId));
	}

	private async destroyLobbyBackground(ctx: ActorContext, serverId: string) {
		// Destroy server
		await ctx.modules.rivet.call({
			method: "DELETE",
			path: `/servers/${serverId}`,
		});
	}

	private findLobby(
		ctx: ActorContext,
		req: FindLobbyRequest,
	): { lobbyId: string; playerIds: string[] } {
		const lobby = this.queryLobby(req.query, req.players.length);
		if (!lobby) {
			throw new RuntimeError("no_matching_lobbies", {
				meta: {
					playerCount: req.players.length,
					query: req.query,
				},
			});
		}
		const { playerIds } = this.createPlayers(ctx, {
			lobbyId: lobby.id,
			players: req.players,
			noWait: true,
		});
		return { lobbyId: lobby.id, playerIds };
	}

	private findOrCreateLobby(
		ctx: ActorContext,
		req: FindOrCreateLobbyRequest,
	): { lobbyId: string; playerIds: string[] } {
		const lobby = this.queryLobby(req.query, req.players.length);
		if (lobby) {
			const { playerIds } = this.createPlayers(ctx, {
				lobbyId: lobby.id,
				players: req.players,
				noWait: true,
			});
			return { lobbyId: lobby.id, playerIds };
		} else {
			return this.createLobby(ctx, {
				lobby: req.lobby,
				players: req.players,
				noWait: true,
			});
		}
	}

	private setLobbyReady(ctx: ActorContext, req: SetLobbyReadyRequest) {
		// Get lobby. Fail gracefully since there may be a race condition with deleting lobby.
		const lobby = this.state.lobbies[req.lobbyId];
		if (!lobby) {
			ctx.log.warn("setting lobby ready on lobby that's already removed", [
				"lobbyId",
				req.lobbyId,
			]);
			return;
		}

    const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);

    // Validate token
    if (!req.hasLobbyToken && requiresLobbyToken(lobbyConfig)) {
      throw new RuntimeError("lobby_token_required")
    }

		// Update ready state
		if (lobby.readyAt !== undefined) {
      if (canCallLobbyReadyMultipleTimes(lobbyConfig)) {
        // Exit gracefully
        return;
      } else {
        throw new RuntimeError("lobby_already_ready");
      }
		}

		lobby.readyAt = Date.now();

		this.emitter.emit(EVENT_KEYS.lobbyUpdate(lobby.id));
	}

	private createPlayers(
		ctx: ActorContext,
		req: JoinLobbyRequest,
	): { playerIds: string[] } {
		const lobby = this.getLobby(req.lobbyId);

		if (req.players.length == 0) {
			return { playerIds: [] };
		}

		// Check for too many players for IP
		if (ctx.config.players.maxPerIp != undefined) {
			// Count the number of IPs for the request
			const reqIpCounts = new Map<string, number>();
			for (const player of req.players) {
				if (player.publicIp) {
					const count = reqIpCounts.get(player.publicIp) ?? 0;
					reqIpCounts.set(player.publicIp, count + 1);
				}
			}

			// Valdiate IPs
			for (const [ip, reqIpCount] of reqIpCounts) {
				const playersForIp = this.playersForIp(ip);

				// Calculate the number of players over the max player count,
				// including the player making the request.
				const ipOverflow = (playersForIp.length + reqIpCount) -
					ctx.config.players.maxPerIp;

				// Handle too many players per IP
				if (ipOverflow > 0) {
					// Before throwing an error, we'll try removing players
					// that have not connected to a server yet. This helps
					// mitigate the edge case where the game has a bug causing
					// players to fail to connect, leaving a lot of unconnected
					// players in the matchmaker. In this situation, new
					// players can still be created.
					//
					// If there are unconnected players that can be removed,
					// those players will be removed and this will continue as
					// normal.

					// Find players that have not connected yet, sorted oldest
					// to newest. This does not include the player that is
					// making the request.
					const unconnectedPlayersForIp = playersForIp
						.filter((x) => x.connectedAt == undefined)
						.sort((a, b) => a.createdAt - b.createdAt);

					// Check if there are enough players that we can delete to
					// make space for the new players
					if (unconnectedPlayersForIp.length >= ipOverflow) {
						ctx.log.warn(
							"removing unconnected player with the same ip to make space for new player. the game server is likely having issues accepting connections.",
							["ip", ip],
							["ipOverflow", ipOverflow],
							["maxPerIp", ctx.config.players.maxPerIp],
						);

						// Remove oldest players first in favor of the new
						// player we're about to add
						for (let i = 0; i < ipOverflow; i++) {
							const unconnectedPlayer = unconnectedPlayersForIp[i]!;
							this.destroyPlayers(ctx, {
								lobbyId: unconnectedPlayer.lobbyId,
                hasLobbyToken: true,
								playerIds: [unconnectedPlayer.id],
							});
						}
					} else {
						// Fail
						throw new RuntimeError("too_many_players_for_ip", {
							meta: { ip },
						});
					}
				}
			}
		}

		// Check if we need to remove unconnected players
		if (ctx.config.players.maxUnconnected != undefined) {
			const unconnectedPlayers = this.unconnectedPlayers();

			const unconnectedOverflow =
				(unconnectedPlayers.length + req.players.length) -
				ctx.config.players.maxUnconnected;
			if (unconnectedOverflow > 0) {
				// Calc number of players to remove
				const unconnectedPlayersToRemove = Math.min(
					unconnectedOverflow,
					unconnectedPlayers.length,
				);
				ctx.log.warn(
					"removing unconnected player to make space for new player. the game server is likely having issues accepting connections.",
					["maxUnconnected", ctx.config.players.maxUnconnected],
					["unconnectedOverflow", unconnectedOverflow],
					["unconnectedPlayersToRemove", unconnectedPlayersToRemove],
				);

				// Remove unconnected players from oldest to newest
				unconnectedPlayers.sort((a, b) => a.createdAt - b.createdAt);
				for (let i = 0; i < unconnectedPlayersToRemove; i++) {
					const player = unconnectedPlayers[i]!;
					this.destroyPlayers(ctx, {
						lobbyId: player.lobbyId,
            hasLobbyToken: true,
						playerIds: [player.id],
					});
				}
			}
		}

		// Check for available spots in lobby
		if (lobby.maxPlayers - req.players.length < 0) {
			throw new RuntimeError("lobby_full", { meta: { lobbyId: req.lobbyId } });
		}

		// Create players
		const players = [];
		for (const playerOpts of req.players) {
      const playerId = crypto.randomUUID();
			const player: PlayerState = {
				id: playerId,
				lobbyId: lobby.id,
				createdAt: Date.now(),
				publicIp: playerOpts.publicIp,
			};
			lobby.players[player.id] = player;
			players.push(player);
		}

		// Make lobby not empty
		lobby.emptyAt = undefined;

		this.emitter.emit(EVENT_KEYS.lobbyUpdate(lobby.id));

		return { playerIds: players.map((x) => x.id) };
	}

	private destroyPlayers(ctx: ActorContext, req: DestroyPlayersRequest) {
		const lobby = this.getLobby(req.lobbyId);
		const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);

    // Validate token
    if (!req.hasLobbyToken && requiresLobbyToken(lobbyConfig)) {
      throw new RuntimeError("lobby_token_required")
    }


		// Remove player
		for (const playerId of req.playerIds) {
			delete lobby.players[playerId];
		}

		// Destroy lobby immediately on empty
		if (Object.keys(lobby.players).length == 0) {
			lobby.emptyAt = Date.now();

			if (canMutateLobbies(lobbyConfig) && lobbyConfig.destroyOnEmptyAfter == 0) {
				ctx.log.info(
					"destroying empty lobby",
					["lobbyId", lobby.id],
					["unreadyExpireAfter", ctx.config.lobbies.unreadyExpireAfter],
				);
				this.destroyLobby(ctx, { lobbyId: lobby.id });
			}
		}

		this.emitter.emit(EVENT_KEYS.lobbyUpdate(lobby.id));
	}

	private setPlayersConnected(
		ctx: ActorContext,
		req: SetPlayersConnectedRequest,
	) {
		const lobby = this.getLobby(req.lobbyId);
    const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);

    // Validate token
    if (!req.hasLobbyToken && requiresLobbyToken(lobbyConfig)) {
      throw new RuntimeError("lobby_token_required")
    }

		// Validate players
		const allPlayers = [];
		for (const playerId of req.playerIds) {
			const player = lobby.players[playerId];
			if (player) {
				// TODO: Allow reusing connection token
				// TODO: What if the player already connected
				if (player.connectedAt != undefined) {
					throw new RuntimeError("player_already_connected", {
						meta: { lobbyId: lobby.id, playerId },
					});
				}

				allPlayers.push(player);
			} else {
				throw new RuntimeError("player_disconnected", {
					meta: { lobbyId: lobby.id, playerId },
				});
			}
		}

		// Update players
		for (const player of allPlayers) {
			player.connectedAt = Date.now();
		}
	}

	public gc(ctx: ActorContext) {
		// Schedule next GC
		this.schedule.after(GC_INTERVAL, "gc", undefined);

		let unreadyLobbies = 0;
		let emptyLobbies = 0;
		let unconnectedPlayers = 0;
		let oldPlayers = 0;
		for (const lobby of Object.values(this.state.lobbies)) {
			const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);

			// Destroy lobby if unready
			// TODO: pass this on lobby create instead of in config?
			if (
        canMutateLobbies(lobbyConfig) &&
				lobby.readyAt == undefined &&
				Date.now() - lobby.createdAt > ctx.config.lobbies.unreadyExpireAfter
			) {
				ctx.log.warn(
					"destroying unready lobby",
					["lobbyId", lobby.id],
					["unreadyExpireAfter", ctx.config.lobbies.unreadyExpireAfter],
				);
				this.destroyLobby(ctx, { lobbyId: lobby.id });
				unreadyLobbies++;
				continue;
			}

			// Destroy lobby if empty for long enough
			if (
        canMutateLobbies(lobbyConfig) &&
				lobbyConfig.destroyOnEmptyAfter != undefined &&
				lobby.emptyAt != undefined &&
				Date.now() - lobby.emptyAt > lobbyConfig.destroyOnEmptyAfter
			) {
				ctx.log.debug(
					"destroying empty lobby",
					["lobbyId", lobby.id],
					["unreadyExpireAfter", ctx.config.lobbies.unreadyExpireAfter],
				);
				this.destroyLobby(ctx, { lobbyId: lobby.id });
				emptyLobbies++;
				continue;
			}

			if (lobby.readyAt != undefined) {
				for (const player of Object.values(lobby.players)) {
					// If joining a preemptively created lobby, the player's
					// created timestamp will be earlier than when the lobby
					// actually becomes able to be connected to.
					//
					// GC players based on the timestamp the lobby started if
					// needed.
					const startAt = Math.max(player.createdAt, lobby.readyAt);

					// Clean up unconnected players
					if (
						player.connectedAt == undefined &&
						Date.now() - startAt > ctx.config.players.unconnectedExpireAfter
					) {
						ctx.log.debug(
							"destroying unconnected player",
							["playerId", player.id],
							[
								"unconnectedExpireAfter",
								ctx.config.players.unconnectedExpireAfter,
							],
						);
						this.destroyPlayers(ctx, {
							lobbyId: player.lobbyId,
              hasLobbyToken: true,
							playerIds: [player.id],
						});
						unconnectedPlayers++;
						continue;
					}

					// Clean up really old players
					if (
						ctx.config.players.autoDestroyAfter != undefined &&
						Date.now() - startAt > ctx.config.players.autoDestroyAfter
					) {
						ctx.log.warn(
							"destroying old player",
							["playerId", player.id],
							["autoDestroyAfter", ctx.config.players.autoDestroyAfter],
						);
						this.destroyPlayers(ctx, {
							lobbyId: player.lobbyId,
              hasLobbyToken: true,
							playerIds: [player.id],
						});
						oldPlayers++;
						continue;
					}
				}
			}
		}

		ctx.log.info(
			"gc summary",
			["unreadyLobbies", unreadyLobbies],
			["emptyLobbies", emptyLobbies],
			["unconnectedPlayers", unconnectedPlayers],
			["oldPlayers", oldPlayers],
		);
	}

	/**
	 * Returns a lobby or throws `lobby_not_found`.
	 */
	private getLobby(lobbyId: string): LobbyState {
		const lobby = this.state.lobbies[lobbyId];
		if (lobby === undefined) {
			throw new RuntimeError("lobby_not_found", {
				meta: { lobbyId },
			});
		}
		return lobby;
	}

	/**
	 * Finds a lobby for a given query.
	 */
	private queryLobby(
		query: QueryRequest,
		playerCount: number,
	): LobbyState | undefined {
		// TODO: optimize
		// Find largest lobby that can fit the requested players
		const lobbies = Object.values(this.state.lobbies)
			.filter((x) => x.version == query.version)
      .filter((x) => query.regions == undefined || query.regions.includes(x.region))
			.filter((x) =>
				Object.keys(x.players).length <= x.maxPlayers - playerCount
			)
			.filter((x) => query.tags == undefined || lobbyTagsMatch(query.tags, x.tags))
			.sort((a, b) => b.createdAt - a.createdAt)
			.sort((a, b) =>
				Object.keys(b.players).length - Object.keys(a.players).length
			);
		return lobbies[0];
	}

	playersForIp(ip: string): PlayerState[] {
		// TODO: optimize
		const players = [];
		for (const lobby of Object.values(this.state.lobbies)) {
			for (const player of Object.values(lobby.players)) {
				if (player.publicIp == ip) {
					players.push(player);
				}
			}
		}
		return players;
	}

	unconnectedPlayers(): PlayerState[] {
		// TODO: optimize
		const players = [];
		for (const lobby of Object.values(this.state.lobbies)) {
			// Don't count unready lobbies since these players haven't had time to connect yet
			if (lobby.readyAt == undefined) continue;

			for (const player of Object.values(lobby.players)) {
				if (player.connectedAt == undefined) {
					players.push(player);
				}
			}
		}
		return players;
	}
}

/**
 * Common response type used for create/find/join requests.
 */
interface BaseLobbyResponse {
	lobby: LobbyResponse;
	players: PlayerResponse[];
}

// MARK: Create Lobby
export interface CreateLobbyRequest {
	lobby: LobbyRequest;
	players: PlayerRequest[];
	noWait: boolean;
}

export type CreateLobbyResponse = BaseLobbyResponse;

// MARK: Destroy Lobby
export interface DestroyLobbyRequest {
	lobbyId: string;
}

// MARK: Find Lobby
export interface FindLobbyRequest {
	query: QueryRequest;
	players: PlayerRequest[];
	noWait: boolean;
}

export type FindLobbyResponse = BaseLobbyResponse;

// MARK: Find or Create
export interface FindOrCreateLobbyRequest {
	query: QueryRequest;
	lobby: LobbyRequest;
	players: PlayerRequest[];
	noWait: boolean;
}

export type FindOrCreateLobbyResponse = BaseLobbyResponse;

// MARK: Set Lobby Ready
export interface SetLobbyReadyRequest {
	lobbyId: string;
  hasLobbyToken: boolean;
}

// MARK: List Lobbies
export type ListLobbiesRequest = QueryRequest;

export interface ListLobbiesResponse {
	lobbies: LobbyResponse[];
}

// MARK: Create Players
export interface JoinLobbyRequest {
	lobbyId: string;
	players: PlayerRequest[];
	// TODO: Make noWait only be passed to rpc
	noWait: boolean;
}

export type JoinLobbyResponse = BaseLobbyResponse;

// MARK: Destroy Players
export interface DestroyPlayersRequest {
	lobbyId: string;
  hasLobbyToken: boolean;
	playerIds: string[];
}

// MARK: Set Players Connected
export interface SetPlayersConnectedRequest {
	lobbyId: string;
  hasLobbyToken: boolean;
	playerIds: string[];
}

// MARK: Common
export interface QueryRequest {
  /**
   * Version is required in query in order to correctly match the client to the
   * correct server version.
   */
	version: string;
  regions?: string[];
	tags?: Record<string, string>;
}

export interface LobbyRequest {
	lobbyId: string;
	version: string;
  region: string;
	tags?: Record<string, string>;
	maxPlayers: number;
	maxPlayersDirect: number;
}

export interface PlayerRequest {
	publicIp?: string;
}
