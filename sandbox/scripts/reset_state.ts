#!/usr/bin/env -S deno run -A

const origin = Deno.env.get("OPENGB_ORIGIN");

const res = await fetch(`${origin}/modules/lobbies/scripts/reset_lobby_manager_state/call`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({}),
});
if (res.status != 200) {
  console.error(await res.text());
  Deno.exit(1);
}

console.log(await res.json());

