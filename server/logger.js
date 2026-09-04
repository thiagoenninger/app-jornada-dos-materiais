// Log de operação: para investidar problemas
// Registro de uso: para saber qual material é o mais escolhido

// Log é apagado automaticamente caso tenha mais de 30 dias, para evitar disco cheio

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const RETENTION_DAYS = 30;

// ---- Date
function pad(value) {
  return String(value).padStart(2, '0');
}

function dateStamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthStamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function timeStamp(date) {
  return `${dateStamp(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function isoStamp(date) {
  return `${dateStamp(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// ---- Securing folder
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// ---- Delete old logs
function cleanOldLogs() {
  try {
    const limit = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const file of fs.readdirSync(LOG_DIR)) {
      if (!file.startsWith('server-') || !file.endsWith('.log')) continue;
      const fullPath = path.join(LOG_DIR, file);
      if (fs.statSync(fullPath).mtimeMs < limit) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch {}
}

// ---- Operation log
function write(level, message, details) {
  const now = new Date();

  const extra = details
    ? ' ' +
      Object.entries(details)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')
    : ' ';

  const line = `${timeStamp(now)}  ${level.padEnd(5)}  ${message}${extra}`;

  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }

  try {
    ensureLogDir();
    fs.appendFileSync(path.join(LOG_DIR, `server-${dateStamp(now)}.log`), `${line}\n`);
  } catch {}
}

const logger = {
  info: (message, details) => write('INFO', message, details),
  warn: (message, details) => write('WARN', message, details),
  error: (message, details) => write('ERROR', message, details),

  // ---- Registro de uso
  // Grava uma linha por jornada completa (caso encerra a etapa 4) / warnings: 0=jornada limpa, acima disso alguma tela travou
  usage(materialId, startedAt, completed, warnings) {
    try {
      ensureLogDir();
      const now = new Date();
      const file = path.join(LOG_DIR, `usage-${monthStamp(now)}.csv`);

      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, 'data_hora,material,concluida,alertas\n');
      }

      const row = `${isoStamp(new Date(startedAt))},${materialId},${completed ? 'sim' : 'nao'},${warnings}\n`;
      fs.appendFileSync(file, row);
    } catch {}
  },

  init() {
    ensureLogDir();
    cleanOldLogs();
  },
};

module.exports = logger;
