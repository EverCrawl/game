// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: { url: "/", static: true },
    client: { url: "/dist" },
    assets: { url: "/assets" },
    common: { url: "/dist" }
  },
  plugins: [
    "tiled-loader",
    "@snowpack/plugin-dotenv",
    "@snowpack/plugin-typescript"
  ],
  optimize: {
    bundle: true,
    minify: true,
    treeshake: true,
    target: "es2020"
  },
  alias: {
    "client": "./client",
    "common": "./common"
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
