pub mod credentials;
pub mod dropbox;
pub mod ftp;
pub mod gdrive;
pub mod icloud;
pub mod oauth;
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
        "smb" => smb::SmbProvider::new(config)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil SMB inválido: {e}")),
        "ftp" | "ftps" => ftp::FtpProvider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil FTP inválido: {e}")),
        "sftp" => sftp::SftpProvider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil SFTP inválido: {e}")),
        "s3" => s3::S3Provider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil S3 inválido: {e}")),
        "dropbox" => dropbox::DropboxProvider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil Dropbox inválido: {e}")),
        "gdrive" | "gdrive_personal" => gdrive::GDriveProvider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil GDrive inválido: {e}")),
        "icloud" => icloud::ICloudProvider::new(config)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil iCloud inválido: {e}")),
        other => Err(format!("Fornecedor desconhecido: {other}")),
    }
}
