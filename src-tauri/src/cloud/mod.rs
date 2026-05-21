pub mod ftp;
pub mod icloud;
pub mod provider;
pub mod retry;
pub mod s3;
pub mod sftp;
pub mod smb;

use provider::CloudProvider;

pub fn get_provider(
    provider_type: &str,
    config: &serde_json::Value,
    creds: &serde_json::Value,
) -> Result<Box<dyn CloudProvider>, String> {
    match provider_type {
        "smb" => Ok(Box::new(smb::SmbProvider::new(config)?)),
        "ftp" | "ftps" => Ok(Box::new(ftp::FtpProvider::new(config, creds)?)),
        "sftp" => Ok(Box::new(sftp::SftpProvider::new(config, creds)?)),
        "s3" => Err("S3Provider será implementado na Fase 2".to_string()),
        "gdrive" => Err("GDriveProvider será implementado na Fase 3".to_string()),
        "icloud" => Ok(Box::new(icloud::ICloudProvider::new(config)?)),
        other => Err(format!("Fornecedor desconhecido: {other}")),
    }
}
