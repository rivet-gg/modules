# Unconnected Players

## Why it exists?

- high load & low player caps
- preventing botting

## What happens when players fail to connect?

- Unconnected players stack up
- How lobbies API handles it
  - Max players per IP: if creating another player and goes over ip limit, will
    delete the old unconnected player for the same IP
  - Maximum unconnected players: if too many unconnected players, we'll start
    discarding the oldest unconnected player
