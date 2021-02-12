// impls with `fn (self: Arc<Self>) { ... }`
#![feature(arbitrary_self_types)]
#![allow(non_fmt_panic)]

mod config;
mod db;
mod net;
mod server;
#[macro_use]
mod util;
#[rustfmt::skip]
mod schemas;
/* mod map; */

use anyhow::Result;

fn setup_panic() {
    use std::panic;
    use std::process;

    let orig_hook = panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        orig_hook(panic_info);
        process::exit(1);
    }));
}

fn main() -> Result<()> {
    setup_panic();

    // default logging to "info"
    match std::env::var("RUST_LOG") {
        Ok(_) => (),
        Err(_) => std::env::set_var("RUST_LOG", "info"),
    };
    // initialize logging
    pretty_env_logger::init();
    // initialize SIGINT/SIGTERM handler
    util::Control::init()?;

    use config::Config;
    use server::*;

    let config = Config::load("config.toml")?;
    Server::new(config).start()?;

    Ok(())
}
