/* 
* Rede de proteção do conteúdo: confere se o materials.json está correto e se todos os vídeos e imagens existem e estão no formato correto.

* Existe para que um erro de digitação no JSON não vire uma tela preta no meio da exibição

* Pré-requisito: ffprobe instalado (vem junto ao programa ffmpeg)

* Uso, a partir da raiz do projeto:
    node scripts/validate-content.js           -> apenas verifica
    node script/validate-content.js --fix      -> corrige divergências nas durações dos vídeos

* Código de saída: 0 (não houve erro) / 1 (pelo menos um erro)
*/

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const CONFIG_FILE = path.join(CONTENT_DIR, 'materials.json');

const FIX = process.argv.includes('--fix');

const EXPECTED_WIDTH = 1920;
const EXPECTED_HEIGHT = 1080;
const EXPECTED_CODEC = 'h264';
const DURATION_TOLERANCE = 0.5;

let errorCount = 0;
let warningCount = 0;
let fixCount = 0;

function error(message) {
  console.log(`   ERRO: ${message}`);
  errorCount += 1;
}

function warn(message) {
  console.log(`   aviso: ${message}`);
  warningCount += 1;
}

// LEITURA DO ARQUIVO DE CONFIGURAÇÃO

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log('ERRO: não encontrei content/materials.json');
    console.log('Rode este script a partir da raiz do projeto.');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (err) {
    console.log('ERRO: content/materials.json não é um JSON válido.');
    console.log(err.message);
    console.log('');
    console.log('Dica: o engano mais comum é vírgula sobrando antes de } ou ].');
    process.exit(1);
  }
}

// LEITURA DAS INFORMAÇÕES TÉCNICAS DO VÍDEO

function probeVideo(filePath) {
  try {
    const raw = execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,codec_name',
        '-show_entries',
        'format=duration',
        '-of',
        'json',
        filePath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    ).toString();

    const data = JSON.parse(raw);
    const stream = data.streams && data.streams[0];
    if (!stream) return null;

    return {
      width: stream.width,
      height: stream.height,
      codec: stream.codec_name,
      duration: parseFloat(data.format.duration),
    };
  } catch {
    return null;
  }
}

// VALIDAÇÃO DAS ETAPAS

function validateStages(config) {
  console.log('Etapas:');

  if (!Array.isArray(config.stages)) {
    error('campo "stages" ausente ou não é uma lista');
    return;
  }

  if (config.stages.length !== 4) {
    error(`esperava 4 etapas, encontrei ${config.stages.length}`);
  }

  const seen = new Set();
  for (const stage of config.stages) {
    if (typeof stage.number !== 'number' || stage.number < 1 || stage.number > 4) {
      error(`número de etapa inválido: ${JSON.stringify(stage.number)}`);
      continue;
    }
    if (seen.has(stage.number)) {
      error(`etapa ${stage.number} aparece mais de uma vez`);
    }
    seen.add(stage.number);

    if (!stage.title || typeof stage.title !== 'string') {
      error(`etapa ${stage.number} está sem "title"`);
    }
  }

  for (let n = 1; n <= 4; n += 1) {
    if (!seen.has(n)) error(`falta a etapa ${n}`);
  }

  if (errorCount === 0) {
    console.log(`    ${config.stages.length} etapas encontradas — OK`);
  }
  console.log('');
}

// VALIDAÇÃO DO MATERIAL

function validateMaterial(material, seenIds, seenOrders) {
  const label = `${material.id || '(sem id)'} (${material.name || 'sem nome'})`;
  const status = material.enabled ? '' : ' — DESABILITADO';
  console.log(`${label}${status}`);

  // --- campos obrigatórios ---
  const required = ['id', 'name', 'description', 'color', 'cardImage', 'order', 'enabled'];
  for (const field of required) {
    if (material[field] === undefined || material[field] === null) {
      error(`campo obrigatório ausente: "${field}"`);
    }
  }

  // --- formato do id ---
  if (material.id) {
    if (!/^[a-z]+$/.test(material.id)) {
      error(
        `id "${material.id}" inválido — use apenas letras minúsculas de a-z, sem acento, espaço, número ou hífen`,
      );
    }
    if (seenIds.has(material.id)) {
      error(`id "${material.id}" está repetido`);
    }
    seenIds.add(material.id);
  }

  // --- order único ---
  if (typeof material.order === 'number') {
    if (seenOrders.has(material.order)) {
      error(`order ${material.order} está repetido`);
    }
    seenOrders.add(material.order);
  }

  // --- cor hexadecimal ---
  if (material.color && !/^#[0-9A-Fa-f]{6}$/.test(material.color)) {
    error(`color "${material.color}" inválida — use o formato #RRGGBB`);
  }

  // --- imagem do card ---
  if (material.cardImage) {
    const imagePath = path.join(CONTENT_DIR, material.cardImage);
    if (!fs.existsSync(imagePath)) {
      if (material.enabled) {
        error(`imagem não encontrada: content/${material.cardImage}`);
      } else {
        warn(`imagem não encontrada: content/${material.cardImage}`);
      }
    }
  }

  // --- lista de vídeos ---
  if (!Array.isArray(material.videos)) {
    error('campo "videos" ausente ou não é uma lista');
    console.log('');
    return;
  }

  const stagesSeen = new Set();
  for (const video of material.videos) {
    if (typeof video.stage !== 'number' || video.stage < 1 || video.stage > 4) {
      error(`vídeo com stage inválido: ${JSON.stringify(video.stage)}`);
      continue;
    }
    if (stagesSeen.has(video.stage)) {
      error(`existe mais de um vídeo para a etapa ${video.stage}`);
    }
    stagesSeen.add(video.stage);
  }
  for (let n = 1; n <= 4; n += 1) {
    if (!stagesSeen.has(n)) error(`falta o vídeo da etapa ${n}`);
  }

  // --- arquivos de vídeo: só para material habilitado ---
  if (!material.enabled) {
    warn('material desabilitado, vídeos não verificados');
    console.log('');
    return;
  }

  for (const video of material.videos) {
    if (typeof video.stage !== 'number') continue;

    const relativePath = video.file || `videos/${material.id}/${video.stage}.mp4`;
    const fullPath = path.join(CONTENT_DIR, relativePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`    content/${relativePath}`);
      error(`arquivo não encontrado: content/${relativePath}`);
      continue;
    }

    const info = probeVideo(fullPath);
    if (!info) {
      console.log(`    content/${relativePath}`);
      error(`não consegui ler o vídeo (arquivo corrompido?): content/${relativePath}`);
      continue;
    }

    const problems = [];

    if (info.width !== EXPECTED_WIDTH || info.height !== EXPECTED_HEIGHT) {
      problems.push(
        `resolução ${info.width}x${info.height} (esperado ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT})`,
      );
    }

    if (info.codec !== EXPECTED_CODEC) {
      problems.push(`codec ${info.codec} (esperado ${EXPECTED_CODEC})`);
    }

    const realDuration = Math.round(info.duration * 10) / 10;
    const declared = video.duration;
    const durationDiffers =
      typeof declared !== 'number' || Math.abs(realDuration - declared) > DURATION_TOLERANCE;

    const line = `    content/${relativePath}   ${realDuration}s   ${info.width}x${info.height}   ${info.codec}`;

    if (problems.length === 0 && !durationDiffers) {
      console.log(`${line}   OK`);
      continue;
    }

    console.log(line);

    for (const problem of problems) {
      error(problem);
    }

    if (durationDiffers) {
      if (FIX) {
        video.duration = realDuration;
        fixCount += 1;
        console.log(`    corrigido: duração ajustada para ${realDuration}s`);
      } else {
        warn(
          `duração declarada ${declared}s, real ${realDuration}s — rode com --fix para corrigir`,
        );
      }
    }
  }

  console.log('');
}

// EXECUÇÃO
console.log('Validando content/materials.json...');
console.log('');

const config = loadConfig();

if (config.version === undefined) {
  console.log('Arquivo:');
  error('campo "version" ausente');
  console.log('');
}

validateStages(config);

if (!Array.isArray(config.materials)) {
  console.log('ERRO: campo "materials" ausente ou não é uma lista');
  process.exit(1);
}

if (config.materials.length === 0) {
  console.log('aviso: nenhum material configurado');
  warningCount += 1;
}

const seenIds = new Set();
const seenOrders = new Set();
for (const material of config.materials) {
  validateMaterial(material, seenIds, seenOrders);
}

const enabledCount = config.materials.filter((m) => m.enabled).length;
if (enabledCount === 0) {
  console.log('aviso: nenhum material habilitado — o tablet ficará sem opções');
  console.log('');
  warningCount += 1;
}

if (FIX && fixCount > 0) {
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  console.log(`${fixCount} duração(ões) corrigida(s) em content/materials.json`);
  console.log('');
}

const errorLabel = errorCount === 1 ? 'erro' : 'erros';
const warningLabel = warningCount === 1 ? 'aviso' : 'avisos';
console.log(`Resultado: ${errorCount} ${errorLabel}, ${warningCount} ${warningLabel}`);

process.exit(errorCount > 0 ? 1 : 0);