# EverCrawl

Monorepo for the game [client](./client), [server](./server), [schema definitions](./schemas) and [assets](./assets).

The game is available live at http://game.jan-prochazka.eu/.

**Controls**

* A/D: Move left/right
* Space: Jump
* W/S: Climb ladders
* X: Drop from ladder
* S: Drop from platform
* F: Use portal

The game heavily utilizes the ECS paradigm (through the use of [μECS](https://github.com/jprochazk/uecs)) and currently consists only of basic rendering, networking and physics.

* Networking
  * WebSockets are the underlying transport protocol
  * Data is serialized to a custom binary format (further described in [packetc](https://github.com/EverCrawl/packetc)).
  * Entity state is only sent if it's been updated
* Physics
  * AABB collision
  * Slopes (fixed angles)
  * One-way platforms
  * Ladders
* Rendering
  * Plain WebGL, no frameworks
  * Primarily batched
  * Animated sprites
  * Map tiles, also optionally animated

### Running locally

Ensure [Node.js](https://nodejs.org/) 15+ is installed. 

Due to the dependency on [`uWebSockets.js`](https://github.com/uNetworking/uWebSockets.js), and [the author's unwillingess to support NPM](https://github.com/uNetworking/uWebSockets.js/discussions/413), [`yarn`](https://yarnpkg.com/) is required to install the required dependencies.

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