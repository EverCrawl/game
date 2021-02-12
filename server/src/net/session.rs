use std::sync::Arc;

use deadqueue::limited;

use super::auth::Credentials;
use super::message;
use super::message::Message;
use crate::net::socket;

pub type Queue = limited::Queue<Event>;

pub enum Event {
    Connected(Session),
    Disconnected(u32),
}

pub struct Session {
    id: u32,
    credentials: Credentials,
    out: Arc<socket::Sender>,
    r#in: Arc<message::Queue>,
}

#[allow(dead_code)]
impl Session {
    pub fn new(id: u32, credentials: Credentials, out: Arc<socket::Sender>, r#in: Arc<message::Queue>) -> Session {
        Session {
            id,
            credentials,
            out,
            r#in,
        }
    }

    #[inline]
    pub fn id(&self) -> u32 { self.id }

    #[inline]
    pub fn cred(&self) -> &Credentials { &self.credentials }

    /// Send a message
    ///
    /// Blocks until the message is sent
    #[inline]
    pub fn send(&self, mut msg: Vec<u8>) {
        // If the queue is full, keep trying to send the message.
        loop {
            // try_push returns the msg as Err(msg) if the queue is full
            msg = match self.out.try_push(msg) {
                Err(e) => e,
                Ok(()) => return,
            }
        }
    }

    /// Send a message
    ///
    /// Non-blocking version of `Session::send` which returns the passed message
    /// if sending it fails
    ///
    /// Failure means that the outgoing message queue is full
    #[inline]
    pub fn try_send(&self, msg: Vec<u8>) -> Option<Vec<u8>> {
        match self.out.try_push(msg) {
            Err(e) => Some(e),
            Ok(()) => None,
        }
    }

    /// Receive a message from the Socket
    #[inline]
    pub fn recv(&mut self) -> Option<Message> { self.r#in.try_pop() }
}
