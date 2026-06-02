use anyhow::Result;
use rusqlite::Connection;
use std::path::Path;

pub mod migrations;

pub fn open(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    // Em Unix, restringir o acesso ao ficheiro da BD ao próprio utilizador (0o600).
    // A BD contém metadados de jobs/perfis; as credenciais ficam no keyring do SO,
    // mas a restrição é defesa-em-profundidade em máquinas multi-utilizador.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(db_path, std::fs::Permissions::from_mode(0o600))?;
    }
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         PRAGMA wal_autocheckpoint=1000;
         PRAGMA foreign_keys=ON;
         PRAGMA busy_timeout=5000;",
    )?;
    migrations::run(&conn)?;
    Ok(conn)
}
