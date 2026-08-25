const WebSocket = require('ws');
 
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;
const BASE = `http://${HOST}:${PORT}`;
 
const STAGE_NAMES = { 1: 'Minérios', 2: 'Mineração', 3: 'Metalurgia', 4: 'Materiais' };
 
const args = process.argv.slice(2);
const wantsList = args.includes('--list');
const requested = args.find((arg) => !arg.startsWith('--')) || null;
 
function clock() {
  return new Date().toLocaleTimeString('pt-BR');
}
 
async function main() {
  // --- descobre os materiais habilitados ---
  let config;
  try {
    const response = await fetch(`${BASE}/api/config`);
    config = await response.json();
  } catch {
    console.error(`Não consegui falar com o servidor em ${BASE}`);
    console.error('O servidor está rodando? (npm start)');
    process.exit(1);
  }
 
  const available = config.materials || [];
 
  if (available.length === 0) {
    console.error('Nenhum material habilitado em content/materials.json.');
    console.error('Troque "enabled" para true em pelo menos um material.');
    process.exit(1);
  }
 
  if (wantsList) {
    console.log('Materiais habilitados:');
    for (const material of available) {
      console.log(`  ${material.id.padEnd(14)} ${material.name}`);
    }
    process.exit(0);
  }
 
  const chosen = requested
    ? available.find((material) => material.id === requested)
    : available[0];
 
  if (!chosen) {
    console.error(`Material "${requested}" não está habilitado.`);
    console.error(`Disponíveis: ${available.map((m) => m.id).join(', ')}`);
    process.exit(1);
  }
 
  // --- conecta como tablet ---
  const socket = new WebSocket(`ws://${HOST}:${PORT}`);
  let started = false;
  let lastStage = null;
 
  socket.on('open', () => {
    socket.send(JSON.stringify({ type: 'hello', role: 'tablet', protocolVersion: 1 }));
    console.log(`Conectado ao servidor em ${BASE}`);
    console.log(`Disparando: ${chosen.name} (${chosen.id})`);
    console.log('');
    socket.send(JSON.stringify({ type: 'selectMaterial', materialId: chosen.id }));
  });
 
  socket.on('message', (raw) => {
    const message = JSON.parse(raw);
 
    if (message.type === 'error') {
      console.log(`  [${clock()}]  recusado pelo servidor: ${message.message}`);
      return;
    }
 
    if (message.type !== 'state') return;
 
    if (message.status === 'playing') {
      started = true;
      if (message.stage !== lastStage) {
        lastStage = message.stage;
        console.log(
          `  [${clock()}]  TELA ${message.stage} — ${STAGE_NAMES[message.stage]}`
        );
      }
      return;
    }
 
    if (message.status === 'resetting' && started) {
      console.log(`  [${clock()}]  jornada concluída, voltando ao início`);
      return;
    }
 
    if (message.status === 'idle' && started) {
      console.log(`  [${clock()}]  sistema livre novamente`);
      console.log('');
      socket.close();
      process.exit(0);
    }
  });
 
  socket.on('error', (error) => {
    console.error(`Erro de conexão: ${error.message}`);
    process.exit(1);
  });
}
 
main();