// ---- Server entrance

const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { WebSocketServer } = require('ws');

const logger = require('./logger');
const configLoader = require('./config');
const { createStateMachine } = require('./state');
const { PROTOCOL_VERSION, ClientMessage, ServerMessage, Role, STAGE_COUNT } = require('./protocol');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const CONTENT_DIR = path.join(ROOT, 'content');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const startedAt = Date.now();

// ---- Config
logger.init();

let config;
try {
  config = configLoader.load();
} catch (error) {
  console.error('');
  console.error('=========================================================');
  console.error(' NÃO FOI POSSÍVEL INICIAR: problema na configuração');
  console.error('=========================================================');
  console.error('');
  console.error(error.message);
  console.error('');
  console.error('Corrija o content/materials.json e tente novamente.');
  console.error('Dica: rode node scripts/validate-content.js');
  console.error('');
  process.exit(1);
}

// ---- Status machine
const machine = createStateMachine({
  config,
  logger,
  onChange: (state) => broadcastState(state),
});

// ---- HTTP
const app = express();
app.disable('x-powered-by');

// ---- video and images
app.use(
  '/content',
  express.static(CONTENT_DIR, {
    maxAge: '7d',
    acceptRanges: true,
    index: false,
  }),
);

// ---- Vite generated files
app.use(express.static(DIST_DIR, { index: false }));

// ---- Pages
function sendApp(res, fileName) {
  const file = path.join(DIST_DIR, fileName);
  if (!fs.existsSync(file)) {
    res
      .status(503)
      .type('text/plain; charset=uft-8')
      .send(
        `O front-end ainda não foi compilado.\n\n` +
          `Rode:  npm run build\n\n` +
          `(esperava encontrar dist/${fileName})`,
      );
    return;
  }
  res.sendFile(file);
}

app.get('/', (req, res) => res.redirect('/tablet'));
app.get('/tablet', (req, res) => sendApp(res, 'tablet.html'));
app.get('/screen', (req, res) => sendApp(res, 'screen.html'));

// ---- Navigator config
app.get('/api/config', (req, res) => {
  res.json(config.publicConfig());
});

// ---- Diagnosis
app.get('/api/health', (req, res) => {
  const connectedScreens = [];
  let tabletConnected = false;

  for (const client of wss.clients) {
    if (client.readyState !== 1 || !client.meta) continue;
    if (client.meta.role === Role.SCREEN) connectedScreens.push(client.meta.screen);
    if (client.meta.role === Role.TABLET) tabletConnected = true;
  }

  const missingScreens = [];
  for (let n = 1; n <= STAGE_COUNT; n += 1) {
    if (!connectedScreens.includes(n)) missingScreens.push(n);
  }

  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  res.json({
    ok: missingScreens.length === 0 && tabletConnected,
    uptimeSeconds,
    uptimeLegivel: formatUptime(uptimeSeconds),
    state: machine.getState(),
    tabletConnectado: tabletConnected,
    telasConectadas: connectedScreens.sort(),
    telasFaltando: missingScreens,
    meteriaisHabilitados: config.enabledMaterials.map((m) => m.id),
    jornadasHoje: journeysToday,
  });
});

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}min ${s}s`;
}

// ---- WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 30000);

let journeysToday = 0;

function send(socket, type, payload) {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify({ type, ...payload }));
}

function broadcastState(state) {
  const message = JSON.stringify({ type: ServerMessage.STATE, ...state });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

function describe(socket) {
  if (!socket.meta) return 'cliente não identificado';
  return socket.meta.role === Role.SCREEN ? `tela ${socket.meta.screen}` : 'tablet';
}

wss.on('connection', (socket) => {
  socket.meta = null;
  socket.isAlive = true;
  send(socket, ServerMessage.STATE, machine.getState());

  socket.on('pong', () => {
    socket.isAlive = true;
  });

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      send(socket, ServerMessage.ERROR, { message: 'mensagem não é JSON válido' });
      return;
    }

    switch (message.type) {
      case ClientMessage.HELLO:
        handleHello(socket, message);
        break;
      case ClientMessage.SELECT_MATERIAL: {
        const result = machine.selectMaterial(message.materialId);
        if (result.accepted) {
          journeysToday += 1;
        } else {
          send(socket, ServerMessage.ERROR, { message: result.reason });
        }
        break;
      }
      case ClientMessage.STAGE_FINISHED:
        machine.stageFinished(message.stage, message.playbackId);
        break;

      case ClientMessage.STAGE_FAILED:
        machine.stageFailed(message.stage, message.playbackId, message.reason);
        break;

      default:
        send(socket, ServerMessage.ERROR, {
          message: `tipo de mensagem desconhecido: ${message.type}`,
        });
    }
  });

  socket.on('close', () => {
    if (socket.meta) logger.info(`${describe(socket)} desconectou`);
  });

  socket.on('error', (error) => {
    logger.error('erro no websocket', { detalhe: error.message });
  });
});

function handleHello(socket, message) {
  const role = message.role === Role.SCREEN ? Role.SCREEN : Role.TABLET;
  const screen = role === Role.SCREEN ? Number(message.screen) : null;

  if (role === Role.SCREEN && (!screen || screen < 1 || screen > STAGE_COUNT)) {
    send(socket, ServerMessage.ERROR, {
      message: `número de tela inválido: ${message.screen}`,
    });
    logger.warn('tela tentou conectar com número inválido', { recebido: message.screen });
    return;
  }

  if (message.protocolVersion !== PROTOCOL_VERSION) {
    logger.warn('cliente com versão de protocolo diferente', {
      cliente: message.protocolVersion,
      servidor: PROTOCOL_VERSION,
    });
  }

  if (role === Role.SCREEN) {
    for (const other of wss.clients) {
      if (
        other !== socket &&
        other.meta &&
        other.meta.role === Role.SCREEN &&
        other.meta.screen === screen
      ) {
        logger.warn('já existe outra tela conectada com este número', {
          tela: screen,
        });
      }
    }
  }

  socket.meta = { role, screen };
  logger.info(`${describe(socket)} conectou`);

  send(socket, ServerMessage.STATE, machine.getState());
}

// ---- on Windows, at 1st start, you HAVE to permit Node in private networks
server.listen(PORT, HOST, () => {
  logger.info(`servidor iniciado na porta ${PORT}`);
  console.log('');
  console.log(`  Tablet: http://localhost:${PORT}/tablet`);
  console.log(`  Telas:  http://localhost:${PORT}/screen?n=1 (n de 1 a 4)`);
  console.log(`  Saúde:  http://localhost:${PORT}/api/health`);
  console.log('');
  console.log(
    `  Materiais habilitados: ${config.enabledMaterials.map((m) => m.id).join(', ') || '(nenhum'}`,
  );
  console.log('');
});

// ---- Clean Shutdown
function shutdown(signal) {
  logger.info(`recebido ${signal}, encerrando`);
  machine.stop();
  for (const client of wss.clients) client.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
