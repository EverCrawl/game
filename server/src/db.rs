use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use anyhow::Result;
use deadqueue::limited::Queue;
use sqlx::postgres;
use tokio_compat_02::FutureExt;

use crate::config;
use crate::util::Control;

pub type Query = dyn (FnOnce(&postgres::PgPool) -> Pin<Box<dyn Future<Output = ()> + Send>>) + Send + Sync + 'static;
pub type QueryQueue = Queue<Box<Query>>;

#[inline]
pub fn url(config: &config::Database) -> String {
    format!(
        "postgresql://{user}:{secret}@{host}:{port}/{db}",
        user = config.user,
        secret = config.secret,
        host = config.host,
        port = config.port,
        db = config.name
    )
}

pub struct Database {
    queue: QueryQueue,
    url: String,
    workers: u32,
}

#[allow(dead_code)]
impl Database {
    pub fn new(config: config::Database, workers: u32) -> Database {
        Database {
            queue: QueryQueue::new(workers as usize),
            url: url(&config),
            workers,
        }
    }

    pub async fn start(self: Arc<Self>) -> Result<()> {
        // TODO: remove .compat() after sqlx tokio updates to 1.0
        log::info!(target: "Database", "Connecting to {}", self.url);
        // TODO: remove .compat() after sqlx tokio updates to 1.0
        let pool = postgres::PgPoolOptions::new()
            .max_connections(self.workers)
            .connect(&self.url)
            .compat()
            .await?;
        log::info!(target: "Database", "Connected");

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = Control::should_stop_async() => {
                        break;
                    }
                    query = self.queue.pop() => {
                        // TODO: remove .compat() after sqlx tokio updates to 1.0
                        query(&pool).compat().await;
                    }
                }
            }
        });

        Ok(())
    }

    #[inline]
    pub fn submit(self: Arc<Self>, mut query: Box<Query>) {
        loop {
            query = match self.queue.try_push(query) {
                Ok(_) => return,
                Err(v) => v,
            }
        }
    }
}
