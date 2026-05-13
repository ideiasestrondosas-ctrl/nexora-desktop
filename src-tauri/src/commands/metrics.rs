use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemMetrics {
    pub cpu_percent: f32,
    pub mem_used_bytes: u64,
    pub mem_total_bytes: u64,
    pub net_rx_bps: u64,
    pub net_tx_bps: u64,
}

// Comando de leitura imediata (sem CPU precisa — usado só para carga inicial)
#[tauri::command]
pub fn get_system_metrics() -> SystemMetrics {
    use sysinfo::System;
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    sys.refresh_memory();
    SystemMetrics {
        cpu_percent: sys.global_cpu_usage(),
        mem_used_bytes: sys.used_memory(),
        mem_total_bytes: sys.total_memory(),
        net_rx_bps: 0,
        net_tx_bps: 0,
    }
}
