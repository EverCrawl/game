EverCrawl server

The game design document is accessible [here](./design.md). The server-specific architecture document is accessible [here](./architecture.md).

# Requirements

* [Rust](https://www.rust-lang.org/) 1.51+
* [PostgreSQL](https://www.postgresql.org/) 13+
* [SQLx CLI](https://github.com/launchbadge/sqlx/tree/master/sqlx-cli)

# Setup

* Fill in `config.toml` with desired values.
* Run the `scripts/setup-db.py` script, which will create the database (as specified in `config.toml`) and run any pending migrations.

```s
$ py scripts/setup-db.py
```

# Usage

Configured by modifying values in `config.toml`.

To start the server, just execute `cargo run`.