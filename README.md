# EverCrawl

Monorepo for the game [client](./client), [server](./server), [schema definitions](./schemas) and [assets](./assets).

**Controls**

* A/D: Move left/right
* Space: Jump
* W/S: Climb ladders
* X: Drop from ladder
* S: Drop from platform
* F: Use portal

The game heavily utilizes the ECS paradigm. Currently, it is made up of only basic rendering, networking and physics.

* Networking
  * WebSockets are the underlying transport protocol
  * Data is serialized to a custom binary format (further described in [https://github.com/EverCrawl/packetc]).
  * Entity state is only sent if it's been updated
* Physics
  * AABB collision
  * Slopes (fixed angles)
  * One-way platforms
  * Ladders
* Rendering
  * Primarily batched
  * Animated sprites
  * Map tiles, also optionally animated
  * Plain WebGL, no frameworks

### Running locally

Ensure [Node.js](https://nodejs.org/) 15+ is installed. 

Due to the dependency on `uWebSockets`, and [the author's unwillingess to support NPM](https://github.com/uNetworking/uWebSockets.js/discussions/413), [`yarn`](https://yarnpkg.com/) is required to install the required dependencies.

```
> yarn
```

Run the following two commands in separate shells:
```
> yarn dev:client
```
```
> yarn dev:server
```