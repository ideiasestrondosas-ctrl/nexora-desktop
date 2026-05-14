import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, Trash2, Search, ScrollText } from 'lucide-react';
import { useLogs } from '@/hooks/useLogs';
import { save } from '@tauri-apps/plugin-dialog';
<<<<<<< HEAD

=======
import { useTranslation } from 'react-i18next';
>>>>>>> dev


export default function LogsPage() {
  const { logs, clearLogs } = useLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('Todos');
  const [sourceFilter, setSourceFilter] = useState<string>('Todas');
  const [timeFilter, setTimeFilter] = useState<string>('Tudo');
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});
  
  const scrollRef = useRef<HTMLDivElement>(null);
<<<<<<< HEAD
=======
  const { t, i18n } = useTranslation();
>>>>>>> dev

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'Todos' && log.level.toUpperCase() !== levelFilter) return false;
    if (sourceFilter !== 'Todas' && log.source !== sourceFilter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    // timeFilter logic could be implemented here using log.ts
    return true;
  });

  const totalLogs = logs.length;
  const errorLogs = logs.filter(l => l.level === 'error').length;
  const warnLogs = logs.filter(l => l.level === 'warn').length;

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleExport = async () => {
    try {
      const path = await save({ defaultPath: 'nexora_logs.txt' });
      if (path) {
        await invoke('export_logs', { path });
      }
    } catch (error) {
      console.error('Failed to export logs', error);
    }
  };

  const handleClear = async () => {
<<<<<<< HEAD
    if (confirm('Tem a certeza que deseja limpar todos os registos?')) {
=======
    if (confirm(t('logs.clearConfirm'))) {
>>>>>>> dev
      await invoke('clear_logs').catch(console.error);
      clearLogs();
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
<<<<<<< HEAD
      case 'debug': return 'bg-gray-800 text-gray-300';
      case 'info': return 'bg-blue-900/50 text-blue-300';
      case 'warn': return 'bg-yellow-900/50 text-yellow-300';
      case 'error': return 'bg-red-900/50 text-red-300';
      default: return 'bg-gray-800 text-gray-300';
=======
      case 'debug': return 'bg-gray-800 text-text-secondary';
      case 'info': return 'bg-blue-900/50 text-blue-300';
      case 'warn': return 'bg-yellow-900/50 text-yellow-300';
      case 'error': return 'bg-red-900/50 text-red-300';
      default: return 'bg-gray-800 text-text-secondary';
>>>>>>> dev
    }
  };

  const getRowBorder = (level: string) => {
    if (level === 'error') return 'border-l-2 border-red-500 pl-2';
    if (level === 'warn') return 'border-l-2 border-yellow-500 pl-2';
    return 'pl-2 border-l-2 border-transparent';
  };

  const toggleErrorExpand = (id: string) => {
    setExpandedErrors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
<<<<<<< HEAD
          <h1 className="text-2xl font-bold text-white mb-2">Registos do Sistema</h1>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="px-2 py-1 bg-[#141824] border border-[#1e2433] rounded-md text-gray-400">Total: {totalLogs}</span>
            {errorLogs > 0 && <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md text-red-400">Erros: {errorLogs}</span>}
            {warnLogs > 0 && <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-400">Avisos: {warnLogs}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-[#141824] border border-[#1e2433] hover:bg-[#1e2433] text-gray-300 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 bg-[#141824] border border-[#1e2433] hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-gray-400 rounded-lg text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" /> Limpar
=======
          <h1 className="text-2xl font-bold text-text-primary mb-2">{t('logs.title')}</h1>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="px-2 py-1 bg-bg-secondary border border-border rounded-md text-text-secondary">{t('logs.total', { count: totalLogs })}</span>
            {errorLogs > 0 && <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md text-red-400">{t('logs.errors')}: {errorLogs}</span>}
            {warnLogs > 0 && <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-400">{t('logs.warnings')}: {warnLogs}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border hover:bg-surface text-text-secondary rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> {t('logs.export')}
          </button>
          <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-text-secondary rounded-lg text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" /> {t('logs.clear')}
>>>>>>> dev
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
<<<<<<< HEAD
      <div className="flex flex-wrap items-center gap-4 bg-[#141824] border border-[#1e2433] rounded-xl p-4 mb-6 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Pesquisar registos..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-[#1A6FD4]"
=======
      <div className="flex flex-wrap items-center gap-4 bg-bg-secondary border border-border rounded-xl p-4 mb-6 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text"
            placeholder={t('logs.searchPlaceholder')} 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary outline-none focus:border-brand"
>>>>>>> dev
          />
        </div>
        
        <select 
          value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
<<<<<<< HEAD
          className="bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-sm text-white outline-none"
        >
          <option>Todos</option><option>DEBUG</option><option>INFO</option><option>WARN</option><option>ERROR</option>
=======
          className="bg-bg-primary border border-border rounded-lg px-4 py-2 text-sm text-text-primary outline-none"
        >
          <option value="Todos">{t('logs.allLevels')}</option>
          <option value="DEBUG">DEBUG</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
>>>>>>> dev
        </select>

        <select 
          value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
<<<<<<< HEAD
          className="bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-sm text-white outline-none"
        >
          <option>Todas</option><option>sidecar</option><option>tauri</option><option>ffmpeg</option><option>app</option>
=======
          className="bg-bg-primary border border-border rounded-lg px-4 py-2 text-sm text-text-primary outline-none"
        >
          <option>{t('logs.sourceAll')}</option><option>sidecar</option><option>tauri</option><option>ffmpeg</option><option>app</option>
>>>>>>> dev
        </select>

        <select 
          value={timeFilter} onChange={e => setTimeFilter(e.target.value)}
<<<<<<< HEAD
          className="bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-sm text-white outline-none"
        >
          <option>Tudo</option><option>Última hora</option><option>Últimas 6h</option><option>Últimas 24h</option><option>7 dias</option>
        </select>

        <div className="flex items-center gap-2 pl-4 border-l border-[#1e2433]">
          <span className="text-sm text-gray-400">Auto-scroll</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
            <div className="w-9 h-5 bg-[#1e2433] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A6FD4]"></div>
=======
          className="bg-bg-primary border border-border rounded-lg px-4 py-2 text-sm text-text-primary outline-none"
        >
          <option>{t('logs.timeAll')}</option><option>{t('logs.time1h')}</option><option>{t('logs.time6h')}</option><option>{t('logs.time24h')}</option><option>{t('logs.time7d')}</option>
        </select>

        <div className="flex items-center gap-2 pl-4 border-l border-border">
          <span className="text-sm text-text-secondary">{t('logs.autoRefresh')}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
            <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
>>>>>>> dev
          </label>
        </div>
      </div>

      {/* TABELA DE LOGS */}
<<<<<<< HEAD
      <div className="flex-1 bg-[#0a0d14] border border-[#1e2433] rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-[120px_80px_100px_1fr] gap-4 bg-[#141824] p-4 text-xs font-semibold text-gray-400 border-b border-[#1e2433]">
          <div>HORA</div>
          <div>NÍVEL</div>
          <div>FONTE</div>
          <div>MENSAGEM</div>
=======
      <div className="flex-1 bg-bg-primary border border-border rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-[120px_80px_100px_1fr] gap-4 bg-bg-secondary p-4 text-xs font-semibold text-text-secondary border-b border-border">
          <div>{t('logs.time')}</div>
          <div>{t('logs.level')}</div>
          <div>{t('logs.source')}</div>
          <div>{t('logs.message')}</div>
>>>>>>> dev
        </div>
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
          {filteredLogs.length === 0 ? (
<<<<<<< HEAD
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ScrollText className="w-12 h-12 mb-4 opacity-20" />
              <p>Sem registos encontrados</p>
              {(levelFilter !== 'Todos' || sourceFilter !== 'Todas' || searchTerm) && (
                <p className="text-xs mt-2">Tenta remover os filtros</p>
=======
            <div className="h-full flex flex-col items-center justify-center text-text-muted">
              <ScrollText className="w-12 h-12 mb-4 opacity-20" />
              <p>{t('logs.noLogs')}</p>
              {(levelFilter !== t('logs.allLevels') || sourceFilter !== t('logs.sourceAll') || searchTerm) && (
                <p className="text-xs mt-2">{t('logs.tryRemoveFilters')}</p>
>>>>>>> dev
              )}
            </div>
          ) : (
            filteredLogs.map(log => {
<<<<<<< HEAD
              const time = new Date(log.ts).toLocaleTimeString('pt-PT', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + new Date(log.ts).getMilliseconds().toString().padStart(3, '0');
=======
              const time = new Date(log.ts).toLocaleTimeString(i18n.language, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + new Date(log.ts).getMilliseconds().toString().padStart(3, '0');
>>>>>>> dev
              const isExpandable = log.level === 'error';
              const expanded = expandedErrors[log.id];

              return (
                <div 
                  key={log.id} 
<<<<<<< HEAD
                  className={`grid grid-cols-[120px_80px_100px_1fr] gap-4 p-2 hover:bg-[#141824]/50 transition-colors text-sm ${isExpandable ? 'cursor-pointer' : ''}`}
                  onClick={() => isExpandable && toggleErrorExpand(log.id)}
                >
                  <div className="font-mono text-xs text-gray-400 flex items-start mt-0.5">{time}</div>
=======
                  className={`grid grid-cols-[120px_80px_100px_1fr] gap-4 p-2 hover:bg-bg-secondary/50 transition-colors text-sm ${isExpandable ? 'cursor-pointer' : ''}`}
                  onClick={() => isExpandable && toggleErrorExpand(log.id)}
                >
                  <div className="font-mono text-xs text-text-secondary flex items-start mt-0.5">{time}</div>
>>>>>>> dev
                  <div className="flex items-start">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </div>
                  <div className="flex items-start">
<<<<<<< HEAD
                    <span className="font-mono text-xs text-gray-500 bg-[#1e2433]/50 px-1.5 py-0.5 rounded">
                      {log.source}
                    </span>
                  </div>
                  <div className={`text-gray-300 font-mono text-xs whitespace-pre-wrap ${getRowBorder(log.level)}`}>
                    {expanded ? log.message : log.message.split('\n')[0]}
                    {isExpandable && !expanded && log.message.includes('\n') && (
                      <span className="text-gray-500 ml-2">... (clique para expandir)</span>
=======
                    <span className="font-mono text-xs text-text-muted bg-surface/50 px-1.5 py-0.5 rounded">
                      {log.source}
                    </span>
                  </div>
                  <div className={`text-text-secondary font-mono text-xs whitespace-pre-wrap ${getRowBorder(log.level)}`}>
                    {expanded ? log.message : log.message.split('\n')[0]}
                    {isExpandable && !expanded && log.message.includes('\n') && (
                      <span className="text-text-muted ml-2">{t('logs.expand')}</span>
>>>>>>> dev
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
