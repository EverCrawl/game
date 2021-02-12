use std::sync::atomic::{AtomicUsize, Ordering};
use std::{
    net::SocketAddr,
    sync::{atomic::AtomicU32, Arc},
};

use tokio::net::{TcpListener, TcpStream};

use super::auth::authenticate;
use super::session;
use super::socket::Socket;

const MAX_CLIENTS: usize = 4usize;

pub struct Acceptor {
    addr: String,
    client_count: Arc<AtomicUsize>,
    id: Arc<AtomicU32>,
    squeue: Arc<session::Queue>,
}

impl Acceptor {
    pub fn new(addr: String, squeue: Arc<session::Queue>) -> Acceptor {
        Acceptor {
            addr,
            client_count: Arc::new(AtomicUsize::new(0)),
            id: Arc::new(AtomicU32::new(0)),
            squeue,
        }
    }

    pub async fn start(self: Arc<Self>) -> Result<(), tokio::io::Error> {
        let listener = TcpListener::bind(&self.addr).await?;
        log::info!(target: "Acceptor", "Bound to {}", self.addr);

        // Only accept a connection if we have slots left
        loop {
            while self.client_count.load(Ordering::SeqCst) < MAX_CLIENTS {
                let (stream, _) = listener.accept().await?;
                // disable nagle's algorithm
                stream.set_nodelay(true)?;

                tokio::spawn(Acceptor::accept(
                    match stream.peer_addr() {
                        Ok(peer) => peer,
                        Err(_) => continue,
                    },
                    stream,
                    self.client_count.clone(),
                    self.squeue.clone(),
                    self.id.fetch_add(1, Ordering::SeqCst),
                ));
            }
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
    }

    async fn accept(
        peer: SocketAddr,
        stream: TcpStream,
        client_count: Arc<AtomicUsize>,
        squeue: Arc<session::Queue>,
        id: u32,
    ) {
        log::debug!(target: "Acceptor", "New peer {}, authenticating", peer);
        let (ws, cred) = match authenticate(stream).await {
            Ok(value) => value,
            Err(err) => return log::error!(target: "Socket", "{}", err),
        };
        log::debug!(target: "Acceptor", "Peer {} authenticated", peer);

        client_count.fetch_add(1, Ordering::SeqCst);
        log::info!(target: "Socket", "Count: {}", client_count.load(Ordering::SeqCst));
        if let Err(err) = Arc::new(Socket::new(id, peer, cred)).start(ws, squeue).await {
            log::info!(target: "Socket", "Errored");
            use tungstenite::Error;
            match err.downcast::<tungstenite::Error>() {
                Ok(err) => match err {
                    Error::ConnectionClosed | Error::Protocol(_) | Error::Utf8 => (),
                    err => log::error!(target: "Socket", "{}", err),
                },
                Err(err) => log::error!(target: "Socket", "{}", err),
            }
        }
        client_count.fetch_sub(1, Ordering::SeqCst);
        log::info!(target: "Socket", "Count: {}", client_count.load(Ordering::SeqCst));
    }
}
