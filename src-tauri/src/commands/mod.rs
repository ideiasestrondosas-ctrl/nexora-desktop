pub mod assets;
pub mod cloud;
pub mod jobs;
pub mod logs;
pub mod metrics;
pub mod profiles;
pub mod settings;
pub mod system;

/// Suprime a janela de consola no Windows para processos filhos de diagnóstico.
/// No-op em macOS e Linux.
pub fn no_window(cmd: &mut std::process::Command) -> &mut std::process::Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd
}
