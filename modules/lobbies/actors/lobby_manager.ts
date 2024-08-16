import {
	__EXPERIMENTAL,
	ActorBase,
	ActorContext,
	Empty,
	RuntimeError,
	UnreachableError,
} from "../module.gen.ts";
import { createNanoEvents } from "https://esm.sh/nanoevents@9.0.0";
import { LobbyConfig } from "../config.ts";
import * as RivetEndpoints from "../utils/rivet/endpoints.ts";
import {
	LobbyBackendResponse,
	LobbyResponse,
	lobbyTagsMatch,
} from "../utils/lobby/mod.ts";
import { PlayerResponse } from "../utils/player.ts";
import {
acceptAnyRegion,
	acceptAnyVersion,
	canCallLobbyReadyMultipleTimes,
	canMutateLobbies,
	getLobbyConfig,
	requiresLobbyToken,
} from "../utils/lobby_config.ts";
import { LobbyBackendServerPortResponse } from "../utils/lobby/backend/server.ts";
import { regionsForBackend } from "../utils/region.ts";
import * as State from "../utils/lobby_manager/state/mod.ts";
import * as Rpc from "../utils/lobby_manager/rpc.ts";

const MANAGER_SERVER_TAG = "manager";
const MANAGER_SERVER_TAG_VALUE = "opengb/lobbies";

const VERSION_BUILD_TAG = "version";
const ENABLED_BUILD_TAG = "enabled";
// const CURRENT_BUILD_TAG = "current";

const TICK_INTERVAL = 1000;
const GC_INTERVAL = 15 * 1000;
const POLL_SERVERS_INTERVAL = 1 * 1000;

const EVENT_KEYS = {
	lobbyUpdate(lobbyId: string): string {
		return `lobby.ready.${lobbyId}`;
	},
};

// TODO: Document why we make everything sync in this actor and use background jobs

export class Actor extends ActorBase<undefined, State.StateVersioned> {
	private emitter = createNanoEvents();

	/** State for the current version. */
	get currentState(): State.State {
		return this.state.state;
	}

	get lobbies(): Record<string, State.Lobby> {
		return this.state.state.lobbies;
	}

	get servers(): Record<string, State.Server> {
		return this.state.state.servers;
	}

	/**
	 * Reasons that the lobbies were destroyed.
	 *
	 * Used to enhance lobby aborted errors.
	 *
	 * This is stored in-memory instead of in the state since it does not need to
	 * be persisted.
	 */
	private lobbyDestroyMeta: Record<string, LobbyDestroyMeta> = {};

	initialize(ctx: ActorContext): State.StateVersioned {
		this.schedule.after(TICK_INTERVAL, "tick", undefined);

		// TODO: This doesn't handle lobbyRules correctly
		// Create default lobbies if needed
		const lobbies: Record<string, State.Lobby> = {};
		if ("localDevelopment" in ctx.config.lobbies.backend) {
			const devConfig = ctx.config.lobbies.backend.localDevelopment;
			const localLobbyId = "00000000-0000-0000-0000-000000000000";

			const ports: Record<string, State.LobbyBackendLocalDevelopmentPort> = {};
			for (const [portName, port] of Object.entries(devConfig.ports)) {
				ports[portName] = {
					protocol: port.protocol,
					hostname: port.hostname ?? "127.0.0.1",
					port: port.port,
				};
			}

			lobbies[localLobbyId] = {
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
					localDevelopment: { ports },
				},
			};
		}

		return {
			version: 1,
			state: {
				lobbies,
				servers: {},
				lastGcAt: 0,
				lastServerPollAt: 0,
			},
		};
	}

	// MARK: RPC
	public async rpcReadState(
		_ctx: ActorContext,
		_req: Empty,
	): Promise<any> {
		return {
			state: this.currentState,
			schedule: await this.schedule.__inspect(),
		};
	}

	public async rpcCreateLobby(
		ctx: ActorContext,
		req: Rpc.CreateLobbyRequest,
	): Promise<Rpc.CreateLobbyResponse> {
		const { lobbyId, playerIds } = this.createLobby(ctx, req);
		if (!req.noWait) await this.waitForLobbyReady(ctx, lobbyId);
		return {
			lobby: this.buildLobbyResponse(ctx, lobbyId),
			players: this.buildPlayersResponse(lobbyId, playerIds),
		};
	}

	public async rpcFindLobby(
		ctx: ActorContext,
		req: Rpc.FindLobbyRequest,
	): Promise<Rpc.FindLobbyResponse> {
		const { lobbyId, playerIds } = this.findLobby(ctx, req);
		if (!req.noWait) await this.waitForLobbyReady(ctx, lobbyId);
		return {
			lobby: this.buildLobbyResponse(ctx, lobbyId),
			players: this.buildPlayersResponse(lobbyId, playerIds),
		};
	}

	public async rpcFindOrCreateLobby(
		ctx: ActorContext,
		req: Rpc.FindOrCreateLobbyRequest,
	): Promise<Rpc.FindOrCreateLobbyResponse> {
		const { lobbyId, playerIds } = this.findOrCreateLobby(ctx, req);
		if (!req.noWait) await this.waitForLobbyReady(ctx, lobbyId);
		return {
			lobby: this.buildLobbyResponse(ctx, lobbyId),
			players: this.buildPlayersResponse(lobbyId, playerIds),
		};
	}

	public async rpcJoinLobby(
		ctx: ActorContext,
		req: Rpc.JoinLobbyRequest,
	): Promise<Rpc.JoinLobbyResponse> {
		const { playerIds } = this.createPlayers(ctx, req);
		if (!req.noWait) await this.waitForLobbyReady(ctx, req.lobbyId);
		return {
			lobby: this.buildLobbyResponse(ctx, req.lobbyId),
			players: this.buildPlayersResponse(req.lobbyId, playerIds),
		};
	}

	public rpcSetLobbyReady(ctx: ActorContext, req: Rpc.SetLobbyReadyRequest) {
		this.setLobbyReady(ctx, req);
	}

	public rpcDestroyPlayers(
		ctx: ActorContext,
		req: Rpc.DestroyPlayersRequest,
	) {
		this.destroyPlayers(ctx, req);
	}

	public rpcSetPlayersConnected(
		ctx: ActorContext,
		req: Rpc.SetPlayersConnectedRequest,
	) {
		this.setPlayersConnected(ctx, req);
	}

	public rpcDestroyLobby(ctx: ActorContext, req: Rpc.DestroyLobbyRequest) {
		this.destroyLobby(ctx, Object.assign({ cause: undefined }, req));
	}

	public rpcListLobbies(
		ctx: ActorContext,
		_req: Rpc.ListLobbiesRequest,
	): Rpc.ListLobbiesResponse {
		return {
			lobbies: Object.keys(this.lobbies).map((x) =>
				this.buildLobbyResponse(ctx, x)
			),
		};
	}

	// MARK: Lobby
	private createLobby(
		ctx: ActorContext,
		req: Rpc.CreateLobbyRequest,
	): { lobbyId: string; playerIds: string[] } {
		const lobbyConfig = getLobbyConfig(ctx.config, req.lobby.tags ?? {});

		// Check lobby can be created
		if (!canMutateLobbies(lobbyConfig)) {
			throw new RuntimeError("cannot_mutate_lobbies");
		}

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
		if (validRegions.findIndex((x) => x.id == req.lobby.region) == -1) {
			throw new RuntimeError("region_not_found", {
				meta: { region: req.lobby.region },
			});
		}

		// Create backend
		let backend: State.LobbyBackend;
		if ("test" in lobbyConfig.backend) {
			backend = { test: {} };
		} else if ("localDevelopment" in lobbyConfig.backend) {
			throw new UnreachableError(undefined as never);
		} else if ("server" in lobbyConfig.backend) {
			// Create backend
			const serverId = crypto.randomUUID();
			backend = {
				server: { serverId },
			};

			// Add server
			const server: State.Server = { id: serverId, createdAt: Date.now() };
			this.servers[server.id] = server;
		} else {
			throw new UnreachableError(lobbyConfig.backend);
		}

		// Create lobby
		const lobby: State.Lobby = {
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
		this.lobbies[lobby.id] = lobby;

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
				this.createServerBackground(
					ctx,
					lobby,
					lobbyConfig,
					backend.server.serverId,
				),
			);
		}

		return { lobbyId: lobby.id, playerIds };
	}

	private async waitForLobbyReady(
		_ctx: ActorContext,
		lobbyId: string,
	): Promise<State.Lobby> {
		// Check the lobby state
		const { status, lobby: newLobby } = this.getLobbyStatus(lobbyId);
		switch (status) {
			case "unready":
				// Do nothing
				break;
			case "ready":
				return newLobby!;
			case "aborted":
				const destroyMeta = this.lobbyDestroyMeta[lobbyId];
				if (destroyMeta?.cause) {
					throw destroyMeta.cause;
				} else {
					throw new RuntimeError("lobby_aborted", {
						meta: { reason: destroyMeta?.reason },
					});
				}
				break;
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
						case "aborted":
							unsubscribe();

							const destroyMeta = this.lobbyDestroyMeta[lobbyId];
							if (destroyMeta?.cause) {
								reject(destroyMeta.cause);
							} else {
								reject(
									new RuntimeError("lobby_aborted", {
										meta: { reason: destroyMeta?.reason },
									}),
								);
							}
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
	): { status: "unready" | "ready" | "aborted"; lobby?: State.Lobby } {
		const lobby = this.lobbies[lobbyId];
		if (!lobby) {
			return { status: "aborted" };
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
		lobby: State.Lobby,
	): "unready" | "ready" | "aborted" {
		if ("test" in lobby.backend) {
			return "ready";
		} else if ("localDevelopment" in lobby.backend) {
			return "ready";
		} else if ("server" in lobby.backend) {
			const server = this.servers[lobby.backend.server.serverId];
			if (server) {
				if (server.rivetServer?.started_at) {
					return "ready";
				} else {
					return "unready";
				}
			} else {
				return "aborted";
			}
		} else {
			throw new UnreachableError(lobby.backend);
		}
	}

	private buildLobbyResponse(
		_ctx: ActorContext,
		lobbyId: string,
	): LobbyResponse {
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
			const server = this.servers[lobby.backend.server.serverId];
			if (!server) throw new Error("server not found");

			const rivetServer = server.rivetServer;
			if (rivetServer) {
				const ports: Record<string, LobbyBackendServerPortResponse> = {};
				for (const [k, v] of Object.entries(rivetServer.network.ports)) {
					ports[k] = {
						protocol: v.protocol,
						internalPort: v.internal_port,
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

	private async createServerBackground(
		ctx: ActorContext,
		lobby: State.Lobby,
		lobbyConfig: LobbyConfig,
		serverId: string,
	) {
		try {
			await this.createServerBackgroundInner(ctx, lobby, lobbyConfig, serverId);
		} catch (err) {
			ctx.log.warn(
				"create lobby background failed, destroying lobby",
				...__EXPERIMENTAL.Log.errorToLogEntries("error", err),
			);

			this.destroyLobby(ctx, {
				lobbyId: lobby.id,
				reason: `${err}`,
				cause: err instanceof RuntimeError ? err : undefined,
			});
		}
	}

	private async createServerBackgroundInner(
		ctx: ActorContext,
		lobby: State.Lobby,
		lobbyConfig: LobbyConfig,
		serverId: string,
	) {
		// TODO: Race condition with publishign & deleting lobby if delete request gets processed first

		const token = await this.createLobbyToken(ctx, lobby.id);

		if (!("server" in lobbyConfig.backend)) return;

		// Build ports
		const ports: Record<string, RivetEndpoints.CreateServerPortRequest> = {};
		for (const [k, v] of Object.entries(lobbyConfig.backend.server.ports)) {
			ports[k] = {
				protocol: v.protocol,
				internal_port: v.internalPort,
				routing: v.routing,
			};
		}

		const { gameId, environmentId } = await ctx.modules.rivet.getConfig({});

		// TODO: Optimize this to only fetch regions once
		// Lookup datacenter
		const { body: { datacenters: rivetDatacenters } } = await ctx.modules.rivet
			.call({
				method: "GET",
				path: `/games/${gameId}/environments/${environmentId}/datacenters`,
			}) as { body: RivetEndpoints.ListDatacentersResponse };
		const dc = rivetDatacenters.find((x) => x.slug == lobby.region);
		if (!dc) {
			// This should be unreachable since the datacenter is
			throw new Error("no datacenter slug matches requested region");
		}

		// TODO: Cache this
		// Lookup build
		const buildTags = {
			[VERSION_BUILD_TAG]: lobby.version,
			[ENABLED_BUILD_TAG]: "true",
		};
		const { body: { builds } } = await ctx.modules.rivet
			.call({
				method: "GET",
				path:
					`/games/${gameId}/environments/${environmentId}/builds?tags_json=${
						encodeURIComponent(JSON.stringify(buildTags))
					}`,
			}) as { body: RivetEndpoints.ListBuildsResponse };
		if (builds.length == 0) {
			throw new RuntimeError("build_not_found", {
				meta: { version: lobby.version },
			});
		}
		const rivetBuild = builds[0]!;
		ctx.log.info("fetched build", [
			"build",
			JSON.stringify(rivetBuild),
		]);

		// Create server
		const serverTags: Record<string, string> = {
			[MANAGER_SERVER_TAG]: MANAGER_SERVER_TAG_VALUE,
			"lobbies/lobby_id": lobby.id,
			"lobbies/version": lobby.version,
		};
		for (const [k, v] of Object.entries(lobby.tags)) {
			serverTags[`lobbies/tags/${k}`] = v;
		}

		const request: RivetEndpoints.CreateServerRequest = {
			datacenter: dc.id,
			tags: serverTags,
			runtime: {
				build: rivetBuild.id,
				arguments: lobbyConfig.backend.server.arguments,
				environment: Object.assign({}, lobbyConfig.backend.server.environment, {
					"LOBBY_ID": lobby.id,
					"LOBBY_VERSION": lobby.version,
					"LOBBY_TOKEN": token,
					"BACKEND_ENDPOINT": ctx.runtime.publicEndpoint,
				}),
			},
			network: {
				mode: lobbyConfig.backend.server.networkMode,
				ports,
			},
			resources: lobbyConfig.backend.server.resources,
		};

		const { body: { server: rivetServer } } = await ctx.modules.rivet
			.call({
				method: "POST",
				path: `/games/${gameId}/environments/${environmentId}/servers`,
				body: request,
			}) as { body: RivetEndpoints.CreateServerResponse };
		ctx.log.info(
			"created server",
			["server", JSON.stringify(rivetServer)],
		);

		// Update server state
		const server = this.servers[serverId];
		if (server) {
			server.createCompleteAt = Date.now();
			server.rivetServer = rivetServer;
		} else {
			ctx.log.warn(
				"server removed before create request finished",
				["serverId", serverId],
				["rivetServerId", rivetServer.id],
			);
		}

		this.emitter.emit(EVENT_KEYS.lobbyUpdate(lobby.id));
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

	private destroyLobby(
		ctx: ActorContext,
		req: Rpc.DestroyLobbyRequest & { cause?: RuntimeError },
	) {
		// Get lobby
		const lobby = this.lobbies[req.lobbyId];
		if (!lobby) {
			throw new RuntimeError("lobby_not_found", {
				meta: { lobbyId: req.lobbyId },
			});
		}

		// Check can be deleted
		const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);
		if (!canMutateLobbies(lobbyConfig)) {
			throw new RuntimeError("cannot_mutate_lobbies");
		}

		// Remove lobby
		delete this.lobbies[req.lobbyId];
		this.lobbyDestroyMeta[req.lobbyId] = {
			destroyedAt: Date.now(),
			reason: req.reason,
			cause: req.cause,
		};

		// TODO: Optimize
		// TODO: Handle backends better
		if ("test" in lobby.backend || "localDevelopment" in lobby.backend) {
			// Do nothing
		} else if ("server" in lobby.backend) {
			const serverId = lobby.backend.server.serverId;

			// Delete server
			const server = this.servers[serverId];
			if (server) {
				this.destroyServer(ctx, {
					serverId,
					reason: "destroy_lobby",
					destroyLobbies: false,
					destroyRivetServer: true,
				});
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

	private destroyServer(
		ctx: ActorContext,
		{ serverId, reason, destroyLobbies, destroyRivetServer }: {
			serverId: string;
			reason: string;
			destroyLobbies: boolean;
			destroyRivetServer: boolean;
		},
	) {
		// Remove server from list
		const server = this.servers[serverId];
		if (!server) {
			ctx.log.warn("tried to delete server that's already deleted", [
				"serverId",
				serverId,
			]);
			return;
		}
		server.destroyedAt = Date.now();
		delete this.servers[server.id];

		// Destroy all lobbies running on this server
		if (destroyLobbies) {
			for (const lobby of Object.values(this.lobbies)) {
				if (
					"server" in lobby.backend &&
					lobby.backend.server.serverId == serverId
				) {
					this.destroyLobby(ctx, {
						lobbyId: lobby.id,
						reason,
					});
				}
			}
		}

		// Destroy server
		if (destroyRivetServer) {
			this.runInBackground(ctx, this.destroyRivetServerBackground(ctx, server));
		}
	}

	private async destroyRivetServerBackground(
		ctx: ActorContext,
		server: State.Server,
	) {
		if (!server.rivetServer) {
			// TODO: This indicates a race condition with create & delete
			ctx.log.warn("deleted server without rivet server", [
				"serverId",
				server.id,
			]);
			return;
		}

		// Destroy server
		const { gameId, environmentId } = await ctx.modules.rivet.getConfig({});
		await ctx.modules.rivet.call({
			method: "DELETE",
			path:
				`/games/${gameId}/environments/${environmentId}/servers/${server.rivetServer.id}`,
		});
	}

	private findLobby(
		ctx: ActorContext,
		req: Rpc.FindLobbyRequest,
	): { lobbyId: string; playerIds: string[] } {
		const lobby = this.queryLobby(ctx, req.query, req.players.length);
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
		req: Rpc.FindOrCreateLobbyRequest,
	): { lobbyId: string; playerIds: string[] } {
		const lobby = this.queryLobby(ctx, req.query, req.players.length);
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

	private setLobbyReady(ctx: ActorContext, req: Rpc.SetLobbyReadyRequest) {
		// Get lobby. Fail gracefully since there may be a race condition with deleting lobby.
		const lobby = this.lobbies[req.lobbyId];
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
			throw new RuntimeError("lobby_token_required");
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
		req: Rpc.JoinLobbyRequest,
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
			const player: State.Player = {
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

	private destroyPlayers(ctx: ActorContext, req: Rpc.DestroyPlayersRequest) {
		const lobby = this.getLobby(req.lobbyId);
		const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);

		// Validate token
		if (!req.hasLobbyToken && requiresLobbyToken(lobbyConfig)) {
			throw new RuntimeError("lobby_token_required");
		}

		// Remove player
		for (const playerId of req.playerIds) {
			delete lobby.players[playerId];
		}

		// Destroy lobby immediately on empty
		if (Object.keys(lobby.players).length == 0) {
			lobby.emptyAt = Date.now();

			if (
				canMutateLobbies(lobbyConfig) && lobbyConfig.destroyOnEmptyAfter == 0
			) {
				ctx.log.info(
					"destroying empty lobby",
					["lobbyId", lobby.id],
					["unreadyExpireAfter", ctx.config.lobbies.unreadyExpireAfter],
				);
				this.destroyLobby(ctx, { lobbyId: lobby.id, reason: "lobby_empty" });
			}
		}

		this.emitter.emit(EVENT_KEYS.lobbyUpdate(lobby.id));
	}

	private setPlayersConnected(
		ctx: ActorContext,
		req: Rpc.SetPlayersConnectedRequest,
	) {
		const lobby = this.getLobby(req.lobbyId);
		const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);

		// Validate token
		if (!req.hasLobbyToken && requiresLobbyToken(lobbyConfig)) {
			throw new RuntimeError("lobby_token_required");
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

	public async pollServers(ctx: ActorContext) {
		// Check if Rivet enabled
		if (!("server" in ctx.config.lobbies.backend)) return;
		if (
			ctx.config.lobbyRules.findIndex((x) =>
				x.config.backend && "server" in x.config.backend
			) != -1
		) {
			return;
		}

		// Check if there are servers
		if (Object.keys(this.servers).length == 0) {
			ctx.log.info("no servers, skipping poll");
		}

		// List all servers
		const serverTags = {
			[MANAGER_SERVER_TAG]: MANAGER_SERVER_TAG_VALUE,
		};
		const { gameId, environmentId } = await ctx.modules.rivet.getConfig({});
		const { body: { servers: rivetServers } } = await ctx.modules.rivet.call(
			{
				method: "GET",
				path:
					`/games/${gameId}/environments/${environmentId}/servers?tags_json=${
						encodeURIComponent(JSON.stringify(serverTags))
					}`,
			},
		) as { body: RivetEndpoints.ListServersResponse };

		// Check for orphaned servers
		for (const rivetServer of Object.values(rivetServers)) {
			if (
				Object.values(this.servers).findIndex((x) =>
					x.rivetServer?.id == rivetServer.id
				) != -1
			) {
				ctx.log.warn(
					"found orphaned server. this is either from (a) another lobbies module running in parallel or (b) a rare race condition with listing servers & POST server returning.",
					["rivetServerId", rivetServer.id],
				);
			}
		}

		// Check for server updates
		for (const [serverId, server] of Object.entries(this.servers)) {
			// Skip server if create request has not finished creating
			if (!server.createCompleteAt || !server.rivetServer) continue;

			const rivetServer = rivetServers.find((x) =>
				x.id == server.rivetServer?.id
			);

			if (rivetServer != undefined) {
				// Update server data
				server.polledAt = Date.now();
				server.rivetServer = rivetServer;

				// Mark server as started
				if (rivetServer.started_at) {
					ctx.log.info("server started", ["serverId", serverId], [
						"rivetServerId",
						rivetServer.id,
					]);

					// Save server data
					const server = this.servers[serverId]!;
					server.rivetServer = rivetServer;
					await this.forceSaveState();

					// Update lobby state
					for (const lobby of Object.values(this.lobbies)) {
						if (
							"server" in lobby.backend &&
							lobby.backend.server.serverId == serverId
						) {
							this.emitter.emit(EVENT_KEYS.lobbyUpdate(lobby.id));
						}
					}
				}
			} else {
				ctx.log.warn(
					"server terminated. this indicates either (a) the server crashed or (b) the server was manually terminated.",
					["serverId", serverId],
					["rivetServerId", server.rivetServer.id],
				);

				this.destroyServer(ctx, {
					serverId,
					reason: "server_terminated",
					destroyLobbies: true,
					destroyRivetServer: false,
				});
			}
		}
	}

	private tick(ctx: ActorContext) {
		this.schedule.after(TICK_INTERVAL, "tick", undefined);

		const now = Date.now();
		if (now - this.currentState.lastGcAt >= GC_INTERVAL) {
			this.currentState.lastGcAt = now;
			this.gc(ctx);
		}
		if (now - this.currentState.lastServerPollAt >= POLL_SERVERS_INTERVAL) {
			this.currentState.lastServerPollAt = now;
			this.pollServers(ctx);
		}
	}

	public gc(ctx: ActorContext) {
		// GC destroy meta
		let expiredLobbyDestroyMeta = 0;
		for (let [lobbyId, meta] of Object.entries(this.lobbyDestroyMeta)) {
			if (Date.now() - meta.destroyedAt > 180_000) {
				expiredLobbyDestroyMeta++;
				delete this.lobbyDestroyMeta[lobbyId];
			}
		}

		// GC lobbies
		let unreadyLobbies = 0;
		let emptyLobbies = 0;
		let unconnectedPlayers = 0;
		let oldPlayers = 0;
		for (const lobby of Object.values(this.lobbies)) {
			const lobbyConfig = getLobbyConfig(ctx.config, lobby.tags);

			// Destroy lobby if unready
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
				this.destroyLobby(ctx, {
					lobbyId: lobby.id,
					reason: "lobby_ready_timeout",
				});
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
				this.destroyLobby(ctx, { lobbyId: lobby.id, reason: "lobby_empty" });
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
						ctx.log.warn("destroying old player", ["playerId", player.id], [
							"autoDestroyAfter",
							ctx.config.players.autoDestroyAfter,
						]);
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
			["expiredLobbyDestroyMeta", expiredLobbyDestroyMeta],
			["unreadyLobbies", unreadyLobbies],
			["emptyLobbies", emptyLobbies],
			["unconnectedPlayers", unconnectedPlayers],
			["oldPlayers", oldPlayers],
		);
	}

	/**
	 * Returns a lobby or throws `lobby_not_found`.
	 */
	private getLobby(lobbyId: string): State.Lobby {
		const lobby = this.lobbies[lobbyId];
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
    ctx: ActorContext,
		query: Rpc.QueryRequest,
		playerCount: number,
	): State.Lobby | undefined {
		// TODO: optimize
		// Find largest lobby that can fit the requested players
		const lobbies = Object.values(this.lobbies)
      .map<[State.Lobby, LobbyConfig]>((lobby) => [lobby, getLobbyConfig(ctx.config, lobby.tags)])
			.filter(([x, config]) => x.version == query.version || acceptAnyVersion(config))
			.filter(([x, config]) =>
				query.regions == undefined || query.regions.includes(x.region) || acceptAnyRegion(config)
			)
			.filter(([x, _]) =>
				Object.keys(x.players).length <= x.maxPlayers - playerCount
			)
			.filter(([x, _]) =>
				query.tags == undefined || lobbyTagsMatch(query.tags, x.tags)
			)
      .map(([x, _]) => x)
			.sort((a, b) => b.createdAt - a.createdAt)
			.sort((a, b) =>
				Object.keys(b.players).length - Object.keys(a.players).length
			);
		return lobbies[0];
	}

	playersForIp(ip: string): State.Player[] {
		// TODO: optimize
		const players = [];
		for (const lobby of Object.values(this.lobbies)) {
			for (const player of Object.values(lobby.players)) {
				if (player.publicIp == ip) {
					players.push(player);
				}
			}
		}
		return players;
	}

	unconnectedPlayers(): State.Player[] {
		// TODO: optimize
		const players = [];
		for (const lobby of Object.values(this.lobbies)) {
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

interface LobbyDestroyMeta {
	destroyedAt: number;
	reason?: string;
	cause?: RuntimeError;
}
