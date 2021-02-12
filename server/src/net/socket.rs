use std::{net::SocketAddr, sync::Arc};

use anyhow::Result;
use deadqueue::limited;
use futures_util::{SinkExt, StreamExt};
use message::Message;
use session::Session;
use tokio::net::TcpStream;
use tokio_tungstenite as ws;
use ws::WebSocketStream;

use super::auth::Credentials;
use super::message;
use super::session;
use crate::util::Control;

pub type Sender = limited::Queue<Vec<u8>>;

pub struct Socket {
    id: u32,
    peer: SocketAddr,
    credentials: Credentials,
}
impl Socket {
    pub fn new(id: u32, peer: SocketAddr, credentials: Credentials) -> Socket { Socket { id, peer, credentials } }

    pub async fn start(
        self: Arc<Self>,
        mut stream: WebSocketStream<TcpStream>,
        squeue: Arc<session::Queue>,
    ) -> Result<()> {
        log::debug!(target: "WebSocket", "{} connected", self.peer);

        // TODO: what's a good size for the message queues?
        // outgoing (client <- server)
        // probably just one packet per frame...
        let out_queue = Arc::new(Sender::new(1));
        // incoming (client -> server)
        // who knows how many per frame...
        let in_queue = Arc::new(message::Queue::new(4));

        squeue
            .push(session::Event::Connected(Session::new(
                self.id,
                self.credentials.clone(),
                out_queue.clone(),
                in_queue.clone(),
            )))
            .await;

        loop {
            tokio::select! {
                // server shutdown
                _ = Control::should_stop_async() => {
                    break;
                }
                // client -> server
                Some(msg) = stream.next() => {
                    let msg = msg?;
                    if msg.is_binary() {
                        in_queue.push(Message::parse(msg.into_data())?).await;
                    } else if msg.is_close() {
                        squeue.push(session::Event::Disconnected(self.id)).await;
                        break;
                    } else {
                        break;
                    }
                },
                // client <- server
                msg = out_queue.pop() => {
                    stream.send(tungstenite::Message::Binary(msg)).await?;
                }
            }
        }

        Ok(())
    }
}
