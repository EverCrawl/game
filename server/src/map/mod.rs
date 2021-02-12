use anyhow::Result;

mod base;

pub struct MapData {}

impl MapData {
    pub fn load(path: &str) -> Result<MapData> {
        let data = std::fs::read_to_string(path)?;
        let tilemap = base::parse(&data)?;

        Ok(MapData {})
    }
}
