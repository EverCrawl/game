use std::cmp::PartialEq;
use std::mem::size_of;

use anyhow::Result;
use packet::{Reader, Writer};

#[derive(Clone, Debug, Default, PartialEq)]
pub struct Header {
    /// Packet type identifier
    pub id: u16,
    /// Payload size in bytes
    pub size: u16,
}
const HEADER_SIZE: usize = size_of::<Header>();

/// A message looks is composed of a header, which contains
/// the packet ID + size, and the payload.
///
/// The header is required, but the payload is not.
#[derive(Clone, Debug, Default)]
pub struct Message {
    header: Header,
    payload: Vec<u8>,
}

#[allow(dead_code)]
impl Message {
    /// Parse a message from a byte buffer.
    ///
    /// Fails if the packet ID is invalid, or the size
    /// does not match the payload size.
    pub fn parse(data: Vec<u8>) -> Result<Self> {
        // parse header
        let header = {
            let mut data = Reader::new(&data[..]);
            Header {
                id: data.read_uint16()?,
                size: data.read_uint16()?,
            }
        };

        // TODO: check if ID is valid
        // check data length as an early-out
        if data.len() != HEADER_SIZE + header.size as usize {
            return Err(anyhow::anyhow!(format!(
                "data.len ({}) does not match header.size + sizeof<Header> ({})",
                data.len(),
                header.size as usize + HEADER_SIZE,
            )));
        }

        Ok(Message { header, payload: data })
    }

    /// Build a message from a packet ID and the payload.
    pub fn build(id: u16, payload: &[u8]) -> Vec<u8> {
        let mut writer = Writer::with_capacity(HEADER_SIZE + payload.len() as usize);
        writer.write_uint16(id);
        writer.write_uint16(payload.len() as u16);
        writer.write_bytes(payload);
        writer.finish()
    }

    /// Packet ID
    #[inline]
    pub fn id(&self) -> u16 { self.header.id }

    /// Packet size
    #[inline]
    pub fn size(&self) -> u16 { self.header.size }

    /// Packet data
    #[inline]
    pub fn payload(&self) -> &[u8] { &self.payload[HEADER_SIZE..self.payload.len()] }
}

impl PartialEq for Message {
    fn eq(&self, other: &Message) -> bool { self.header.eq(&other.header) && self.payload().eq(other.payload()) }
}

pub type Queue = deadqueue::limited::Queue<Message>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serialize() {
        let msg = Message::build(0, &[]);
        assert_eq!(msg, vec![0, 0, 0, 0]);
    }

    #[test]
    fn deserialize() {
        let msg = Message::parse(vec![0, 0, 0, 0]).unwrap();
        assert_eq!(msg.id(), 0);
        assert_eq!(msg.size(), 0);
        assert_eq!(msg.payload(), &[]);
    }
}
