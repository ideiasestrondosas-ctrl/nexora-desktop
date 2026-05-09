use anyhow::Result;
use rusqlite::Connection;
use std::path::Path;

pub mod migrations;

pub fn open(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;
         PRAGMA busy_timeout=5000;",
    )?;
    migrations::run(&conn)?;
    Ok(conn)
}
