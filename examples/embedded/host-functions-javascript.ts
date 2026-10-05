import { AgentOs } from "@rivet-dev/agentos-core";
import { z } from "zod";

// The handler runs on the host, so the API key never enters the VM.
const vm = await AgentOs.create({
	hostFunctions: {
		weather: {
			forecast: {
				inputSchema: z
					.object({ city: z.string() })
					.describe("Get the weather forecast for a city"),
				execute: async ({ city }) => {
					const res = await fetch(
						`https://api.weather.example/forecast?city=${city}&key=${process.env.WEATHER_API_KEY}`,
					);
					return res.json();
				},
			},
		},
	},
});

try {
	// Guest JavaScript gets each collection as a global, and each host function
	// as an async function.
	const result = await vm.javascript.execute(
		`
		const forecast = await weather.forecast({ city: "Paris" });
		console.log(forecast);
		`,
		{ output: { capture: "all" } },
	);
	console.log(result.outcome === "succeeded" ? result.stdout : result.error);
} finally {
	await vm.dispose();
}
