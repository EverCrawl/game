This repository hosts the game client for an online browser-based platformer.

### Prerequisites

* [Node](https://nodejs.org/en/) 14+
* WebGL2 compatible browser
  * You can check if your browser supports it [here](https://webglreport.com/?v=2)

### Build

The repository should be cloned recursively.

```
$ git clone --recurse-submodules git://github.com/jprochazk/underworld-client.git
$ cd client
$ npm install
$ npm run dev
```

The client will be served to localhost and opened in a new browser window.

### Controls

- `A` and `D` to move left and right
- `Space` to jump
- `W` when on a ladder to grab it
- `S` when above a ladder to grab it
- `S` when on a platform to jump off the platform

Some of the physics are still buggy, and require further testing/tweaking.