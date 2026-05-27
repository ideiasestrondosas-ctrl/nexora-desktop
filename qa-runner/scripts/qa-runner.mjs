#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { QaLogger } from './logger.mjs';
import { detectNexoraProcess, findInstalledApp, getSystemSnapshot, startAppIfPossible } from './detect-app.mjs';
import { discoverVideos, prepareQaVideos } from './video-input.mjs';
import { MetricsCollector } from './collect-metrics.mjs';
import { writeReports } from './generate-report.mjs';

const __filename = fileURLToPath(import.meta.url);
const runnerRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(runnerRoot, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(runnerRoot, relativePath), 'utf8'));
}

function parseArgs(argv) {
  const args = { suite: 'quick', openReport: true, noStartApp: false, videoDir: null, duration: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--suite') args.suite = argv[++i] || 'quick';
    else if (arg === '--video-dir') args.videoDir = argv[++i] || null;
    else if (arg === '--duration') args.duration = Number(argv[++i] || 0);
    else if (arg === '--no-open') args.openReport = false;
    else if (arg === '--no-start-app') args.noStartApp = true;
  }
  return args;
}

function showHelp() {
  console.log(`Nexora QA Runner

Uso simples:
  Abrir um dos scripts em qa-runner/windows, qa-runner/macos ou qa-runner/linux.

Uso tecnico interno:
  node qa-runner/scripts/qa-runner.mjs --suite quick
  node qa-runner/scripts/qa-runner.mjs --suite complete
  node qa-runner/scripts/qa-runner.mjs --suite video
  node qa-runner/scripts/qa-runner.mjs --suite stress-light
  node qa-runner/scripts/qa-runner.mjs --suite stress-heavy
  node qa-runner/scripts/qa-runner.mjs --suite soak --duration 60

Opcoes:
  --suite <nome>       quick | complete | video | stress-light | stress-heavy | soak
  --video-dir <pasta>  pasta adicional com videos de teste
  --duration <seg>     duracao alvo para soak/stress
  --no-start-app       nao tenta iniciar a app se estiver fechada
  --no-open            nao tenta abrir o relatorio no fim
  --help               mostra esta ajuda
`);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDirs(runDir) {
  for (const dir of ['screenshots', 'logs', 'qa-input']) {
    fs.mkdirSync(path.join(runDir, dir), { recursive: true });
  }
}

function addTest(tests, logger, name, fn) {
  const started = Date.now();
  try {
    const result = fn();
    const durationMs = Date.now() - started;
    const test = {
      name,
      status: result.status || 'pass',
      durationMs,
      expected: result.expected,
      actual: result.actual,
      evidence: result.evidence || '',
      area: result.area || 'qa-runner',
    };
    tests.push(test);
    logger.result(name, test.status, durationMs, test.evidence);
    return test;
  } catch (error) {
    const durationMs = Date.now() - started;
    const test = {
      name,
      status: 'fail',
      durationMs,
      expected: 'Teste executa sem erro.',
      actual: error instanceof Error ? error.message : String(error),
      evidence: 'logs/debug.log',
      area: 'qa-runner',
    };
    tests.push(test);
    logger.result(name, 'fail', durationMs, test.evidence);
    logger.debug('Test failed', { name, error: test.actual });
    return test;
  }
}

function existsTest(filePath, expected) {
  return {
    status: fs.existsSync(filePath) ? 'pass' : 'fail',
    expected,
    actual: fs.existsSync(filePath) ? `Encontrado: ${filePath}` : `Em falta: ${filePath}`,
    evidence: path.relative(repoRoot, filePath),
  };
}

function openReport(filePath) {
  try {
    if (process.platform === 'win32') {
      execFileSync('cmd.exe', ['/c', 'start', '', filePath], { windowsHide: true });
    } else if (process.platform === 'darwin') {
      execFileSync('open', [filePath]);
    } else {
      execFileSync('xdg-open', [filePath]);
    }
    return true;
  } catch {
    return false;
  }
}

function copyAppLogs(runDir) {
  const appLog = path.join(runDir, 'logs', 'app.log');
  const sidecarLog = path.join(runDir, 'logs', 'sidecar.log');
  fs.writeFileSync(appLog, 'QA Runner: nenhum log real da app foi copiado nesta execucao isolada.\n', 'utf8');
  fs.writeFileSync(sidecarLog, 'QA Runner: nenhum log real do sidecar foi copiado nesta execucao isolada.\n', 'utf8');
}

function writeLatestPointer(reportsRoot, runDir) {
  fs.writeFileSync(path.join(reportsRoot, 'latest.json'), JSON.stringify({ runDir }, null, 2), 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    showHelp();
    return;
  }

  const config = readJson('config/qa.config.json');
  const suites = readJson('config/test-suites.json');
  const suite = suites[args.suite] ? args.suite : 'quick';
  const suiteConfig = suites[suite];
  const reportsRoot = path.resolve(runnerRoot, config.reportsDirectory);
  const runId = nowStamp();
  const runDir = path.join(reportsRoot, runId);
  fs.mkdirSync(runDir, { recursive: true });
  ensureDirs(runDir);

  const logger = new QaLogger(runDir);
  const metrics = new MetricsCollector(runDir);
  const tests = [];
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  logger.line('NEXORA QA RUNNER');
  logger.line('================');
  logger.line(`Suite: ${suiteConfig.label}`);
  logger.line(`Run: ${runId}`);

  logger.step(1, 8, 'A preparar ambiente QA isolado...');
  metrics.sample('start');
  addTest(tests, logger, 'Diretoria do subprojeto', () =>
    existsTest(runnerRoot, 'A pasta qa-runner existe.'),
  );
  addTest(tests, logger, 'Configuracao do runner', () =>
    existsTest(path.join(runnerRoot, 'config', 'qa.config.json'), 'Configuracao QA existe.'),
  );

  logger.step(2, 8, 'A procurar videos de teste seguros...');
  const discoveredVideos = discoverVideos(repoRoot, config, args.videoDir);
  const profile =
    suite === 'stress-heavy'
      ? config.stressProfiles.heavy
      : suite === 'soak'
        ? config.stressProfiles.soak
        : suite === 'stress-light'
          ? config.stressProfiles.light
          : { targetCopies: suiteConfig.requiresVideos ? 1 : 0, durationSeconds: 0 };
  const targetCopies = Math.max(profile.targetCopies || 0, suiteConfig.requiresVideos ? 1 : 0);
  const copiedVideos = targetCopies > 0 ? prepareQaVideos(discoveredVideos, runDir, targetCopies) : [];
  addTest(tests, logger, 'Videos de teste', () => {
    if (!suiteConfig.requiresVideos) {
      return {
        status: discoveredVideos.length > 0 ? 'pass' : 'warning',
        expected: 'Fixture interna ou pasta Videos_Tests disponivel quando possivel.',
        actual: `${discoveredVideos.length} video(s) encontrado(s).`,
        evidence: discoveredVideos[0] ? path.relative(repoRoot, discoveredVideos[0]) : 'logs/test-run.log',
      };
    }
    return {
      status: copiedVideos.length > 0 ? 'pass' : 'fail',
      expected: 'Pelo menos um video copiado para area QA.',
      actual: `${copiedVideos.length} copia(s) criada(s).`,
      evidence: 'qa-input/',
      area: 'qa-runner/video-input',
    };
  });

  logger.step(3, 8, 'A verificar se Nexora Desktop esta a correr...');
  const processInfo = detectNexoraProcess();
  logger.debug('Process detection', processInfo);
  addTest(tests, logger, 'Deteccao da aplicacao', () => ({
    status: processInfo.running ? 'pass' : 'warning',
    expected: 'Detectar Nexora Desktop se estiver aberto.',
    actual: processInfo.running ? 'Processo Nexora encontrado.' : 'Processo Nexora nao encontrado; execucao continua em modo isolado.',
    evidence: 'logs/debug.log',
    area: 'app-detection',
  }));

  logger.step(4, 8, 'A tentar iniciar a aplicacao apenas se for seguro...');
  const appPath = findInstalledApp(repoRoot);
  let startResult = { started: false, pid: null, reason: 'Ignorado.' };
  if (!processInfo.running && !args.noStartApp && appPath) {
    startResult = startAppIfPossible(appPath, logger);
  }
  addTest(tests, logger, 'Arranque seguro da app', () => ({
    status: processInfo.running || startResult.started || appPath ? 'pass' : 'warning',
    expected: 'Usar app aberta ou binario instalado quando disponivel.',
    actual: processInfo.running
      ? 'App ja estava a correr.'
      : startResult.started
        ? `App iniciada em modo QA com PID ${startResult.pid}.`
        : startResult.reason,
    evidence: 'logs/debug.log',
    area: 'app-startup',
  }));

  logger.step(5, 8, 'A executar verificacoes funcionais nao destrutivas...');
  const requiredScripts = [
    'windows/Executar-Teste-Rapido.bat',
    'windows/Executar-Teste-Completo.bat',
    'windows/Executar-Teste-Com-Video.bat',
    'windows/Executar-Teste-Stress-Leve.bat',
    'windows/Executar-Teste-Stress-Forte.bat',
    'windows/Abrir-Ultimo-Relatorio.bat',
    'macos/Executar-Teste-Rapido.command',
    'macos/Executar-Teste-Completo.command',
    'macos/Executar-Teste-Com-Video.command',
    'macos/Executar-Teste-Stress-Leve.command',
    'macos/Executar-Teste-Stress-Forte.command',
    'macos/Abrir-Ultimo-Relatorio.command',
    'linux/executar-teste-rapido.sh',
    'linux/executar-teste-completo.sh',
    'linux/executar-teste-com-video.sh',
    'linux/executar-teste-stress-leve.sh',
    'linux/executar-teste-stress-forte.sh',
    'linux/abrir-ultimo-relatorio.sh',
  ];
  addTest(tests, logger, 'Scripts multiplataforma', () => {
    const missing = requiredScripts.filter((script) => !fs.existsSync(path.join(runnerRoot, script)));
    return {
      status: missing.length === 0 ? 'pass' : 'fail',
      expected: 'Todos os scripts amigaveis existem.',
      actual: missing.length === 0 ? 'Todos presentes.' : `Em falta: ${missing.join(', ')}`,
      evidence: 'qa-runner/',
    };
  });
  addTest(tests, logger, 'Documentacao do QA Runner', () => {
    const docs = [
      path.join(repoRoot, 'docs', 'QA-RUNNER-SPEC.md'),
      path.join(repoRoot, 'docs', 'QA-RUNNER-USAGE.md'),
      path.join(runnerRoot, 'README-UTILIZADOR.md'),
      path.join(runnerRoot, 'README-TECHNICAL.md'),
    ];
    const missing = docs.filter((doc) => !fs.existsSync(doc));
    return {
      status: missing.length === 0 ? 'pass' : 'fail',
      expected: 'Documentacao completa existe.',
      actual: missing.length === 0 ? 'Documentacao encontrada.' : `Em falta: ${missing.join(', ')}`,
      evidence: 'docs/QA-RUNNER-SPEC.md',
    };
  });

  logger.step(6, 8, 'A recolher metricas e logs...');
  metrics.sample('after-tests');
  copyAppLogs(runDir);
  addTest(tests, logger, 'Metricas do sistema', () => {
    const snapshot = getSystemSnapshot();
    fs.writeFileSync(path.join(runDir, 'system-snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf8');
    return {
      status: 'pass',
      expected: 'Guardar snapshot de sistema.',
      actual: `${snapshot.cpus} CPU threads, memoria usada ${snapshot.memoryUsedBytes} bytes.`,
      evidence: 'system-snapshot.json',
    };
  });

  logger.step(7, 8, 'A gerar relatorios...');
  const metricsCsv = metrics.writeCsv();
  const finishedAt = new Date().toISOString();
  const run = {
    runId,
    suite,
    suiteLabel: suiteConfig.label,
    startedAt,
    finishedAt,
    totalDurationMs: Date.now() - startedMs,
    repoRoot,
    runnerRoot,
    tests,
    videos: {
      found: discoveredVideos.length,
      copied: copiedVideos.length,
      copiedBytes: copiedVideos.reduce((sum, v) => sum + v.sizeBytes, 0),
    },
    metricsCsv: path.relative(runDir, metricsCsv),
  };
  const reports = writeReports(runDir, run);
  writeLatestPointer(reportsRoot, runDir);
  addTest(tests, logger, 'Relatorios gerados', () => ({
    status: fs.existsSync(reports.html) && fs.existsSync(reports.json) ? 'pass' : 'fail',
    expected: 'HTML, Markdown, JSON, stats e handoff criados.',
    actual: `Relatorio principal: ${reports.html}`,
    evidence: 'index.html',
  }));
  writeReports(runDir, { ...run, tests, finishedAt: new Date().toISOString(), totalDurationMs: Date.now() - startedMs });

  logger.step(8, 8, 'A concluir e abrir relatorio visual...');
  if (args.openReport) {
    const opened = openReport(reports.html);
    logger.line(opened ? `Relatorio aberto: ${reports.html}` : `Relatorio criado: ${reports.html}`);
  } else {
    logger.line(`Relatorio criado: ${reports.html}`);
  }
  logger.line('Execucao concluida.');
}

main().catch((error) => {
  console.error('QA Runner falhou:', error);
  process.exitCode = 1;
});
