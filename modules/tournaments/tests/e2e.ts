import { RuntimeError, test, TestContext } from "../module.gen.ts";
import {
	assertArrayIncludes,
	assertEquals,
	assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

test("e2e", async (ctx: TestContext) => {
	const match = await ctx.modules.tournaments.createMatch({
        teams: [
            {
                players: [
                    { playerId: "428ab90b-2bd6-44fc-bc41-74004fb648fb" },
                    { playerId: "eec322b9-3041-4866-bf93-cbac8decfe2e" },
                ],
            },
            {
                players: [
                    { playerId: "3f357f1c-190b-4dbc-9a08-bb5d5c4597a1" },
                    { playerId: "24102766-0e9d-4fd2-bc7c-2063acced94c" },
                ],
            },
        ]
    });
    ctx.log.info(Deno.inspect(match.matchId));
    await ctx.modules.tournaments.getMatchStatus({
        matchId: match.matchId
    });
});
