# MitMe Architecture

## Layers

- Mobile: Expo Router + React Native + TypeScript. UI and feature logic are separated from API/socket clients.
- Web: React + Vite + TypeScript. Desktop-first collaboration workspace with responsive mobile fallback.
- API: Express controllers -> services -> Mongoose models. Routes contain transport concerns only.
- Realtime: Socket.IO namespaces/rooms for user presence, conversations, meetings and whiteboards.
- Media: `MediaProvider` interface. Browser WebRTC signaling is implemented for small calls; the same meeting contract can hand off to an SFU token/session service.

## Scaling

Run API instances behind a load balancer. Add the Socket.IO Redis adapter when horizontally scaling. Use MongoDB replica sets for transactions and indexes. Store files in private object storage and issue short-lived signed URLs.
