use anyhow::Result;
use serde::Deserialize;

pub fn parse(data: &str) -> Result<TileMap> {
    Ok(quick_xml::de::from_str::<TileMap>(data)?)
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PropertyType {
    String,
    Int,
    Float,
    Bool,
    Color,
    File,
    Object,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum PropertyValue {
    String(String),
    Int(i64),
    Float(f64),
    Bool(bool),
    Color(String),
    File(String),
    Object(u64),
}

#[derive(Clone, Debug, Deserialize)]
pub struct Property {
    name: String,
    #[serde(rename = "type")]
    r#type: PropertyType,
    value: PropertyValue,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Properties {
    #[serde(rename = "property")]
    list: Vec<Property>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct TileSetTile {
    id: i64,
    properties: Option<Properties>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct TileSet {
    firstgid: i64,
    name: String,
    tilewidth: i64,
    tileheight: i64,
    tilecount: i64,
    columns: i64,
    #[serde(rename = "tile")]
    tiles: Vec<TileSetTile>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LayerDataEncoding {
    Base64,
    CSV,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Chunk {
    x: i64,
    y: i64,
    width: i64,
    height: i64,
    #[serde(rename = "$value")]
    tiles: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct LayerData {
    #[serde(rename = "chunk")]
    chunks: Vec<Chunk>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Layer {
    id: i64,
    name: String,
    width: i64,
    height: i64,
    properties: Option<Properties>,
    data: LayerData,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Object {
    id: i64,
    name: String,
    r#type: String,
    x: i64,
    y: i64,
    width: i64,
    height: i64,
    rotation: i64,
    gid: i64,
    visible: bool,
}

#[derive(Clone, Debug, Deserialize)]
pub struct ObjectGroup {
    id: i64,
    name: String,
    color: String,
    x: i64,
    y: i64,
    width: i64,
    height: i64,
    opacity: i64,
    visible: bool,
    tintcolor: String,
    offsetx: i64,
    offsety: i64,
    properties: Option<Properties>,
    #[serde(rename = "object")]
    objects: Vec<Object>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct TileMap {
    version: String,
    width: i64,
    height: i64,
    properties: Option<Properties>,
    #[serde(rename = "tileset")]
    tilesets: Option<Vec<TileSet>>,
    #[serde(rename = "layer")]
    layers: Option<Vec<Layer>>,
    #[serde(rename = "objectgroup")]
    objectgroups: Option<Vec<ObjectGroup>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    /* #[test]
    fn parses_correctly() {
        let data = include_str!("./test.tmx");
        parse(data).unwrap();
    } */
}
