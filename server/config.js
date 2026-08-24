const fs = require('fs')
const path = require('path')
const {STAGE_COUNT} = require('./protocol')

const ROOT = path.join(__dirname, '..')
const CONTENT_DIR = path.join(ROOT, 'content')
const CONFIG_FILE = path.join(CONTENT_DIR, 'materials.json')

const DEFAULT_RESET_DELAY = 3
const DEFAULT_SAFETY_MARGIN = 10

// --- Validation
function validate(raw) {
    const problems = []

    if(raw.version === undefined) {
        problems.push('campo "version" ausente')
    }

    // ---- stages
    if(!Array.isArray(raw.stages)) {
        problems.push('campo "stages" ausente ou não é uma lista')
    } else {
        if(raw.stages.length !== STAGE_COUNT) {
            problems.push(`esperava ${STAGE_COUNT} etapas, encontrei ${raw.stages.length}`)
        }
        const seen = new Set();
        for (const stage of raw.stages) {
            if(typeof stage.number !== 'number' || stage.number < 1 || stage.number > STAGE_COUNT) {
                problems.push(`etapa com número inválido: ${JSON.stringify(stage.number)}`);
                continue;
            }
            if(seen.has(stage.number)) {
                problems.push(`etapa ${stage.number} aparece mais de uma vez`)
            }
            seen.add(stage.number)
            if (!stage.title) {
                problems.push(`etapa ${stage.number} está sem "title"`)
            }
        }
        for (let n=1; n<=STAGE_COUNT; n+=1) {
            if (!seen.has(n)) problems.push(`falta a etapa ${n}`);
        }
    }

    // ---- materials
    if (!Array.isArray(raw.materials)) {
        problems.push('campo "materials" ausente ou não é uma lista');
        return problems
    }

    const seenIds = new Set();
    const seenOrders = new Set();

    for (const material of raw.materials) {
        const label = material.id || '(material sem id)'

        for (const field of ['id', 'name', 'description', 'color', 'cardImage', 'order']) {
            if (material[field] === undefined || material[field] === null) {
                problems.push(`${label}: campo obrigatório ausente "${field}"`)
            }
        }

        if (typeof material.enabled !== 'boolean') {
            problems.push(`${label}: campo "enabled" precisa ser true ou false`)
        }

        if(material.id) {
            if(!/^[a-z]+$/.test(material.id)) {
                problems.push(`${label}: id inválido - use apenas letras minúsculas de a-z`)
            }
            if(seenIds.has(material.id)) {
                problems.push(`${label}: id repetido`)
            }
            seenIds.add(material.id)
        }

        if(typeof material.order === 'number') {
            if (seenOrders.has(material.order)) {
                problems.push(`${label}: order ${material.order} repetido`)
            }
            seenOrders.add(material.order)
        }

        if (material.color && !/^#[0-9A-Fa-f]{6}$/.test(material.color)) {
            problems.push(`${label}: color "${material.color}" inválida — use #RRGGBB`)
        }
        
        if(!Array.isArray(material.videos)) {
            problems.push(`${label}: campo "videos" ausente ou não é uma lista`)
            continue
        }

        const stagesSeen = new Set();
        for (const video of material.videos) {
            if (typeof video.stage !== 'number' || video.stage < 1 || video.stage > STAGE_COUNT) {
                problems.push(`${label}: vídeo com stage inválido ${JSON.stringify(video.stage)}`)
                continue
            }
            if (stagesSeen.has(video.stage)) {
                problems.push(`${label}: mais de um vídeo para a etapa ${video.stage}`)
            }
            stagesSeen.add(video.stage);

            if (typeof video.duration !== 'number' || video.duration <= 0) {
                problems.push(`${label}: etapa ${video.stage} com duração inválida`)
            }
        }
        for (let n=1; n <= STAGE_COUNT; n+=1) {
            if (!stagesSeen.has(n)) problems.push(`${label}: falta o vídeo da etapa ${n}`)
        }
        
        if (material.enabled !== true) continue;

        if (material.cardImage) {
            const imagePath = path.join(CONTENT_DIR, material.cardImage)
            if (!fs.existsSync(imagePath)) {
                problems.push(`${label}: imagem não encontrada em content/${material.cardImage}`)
            }
        }

        for (const video of material.videos) {
            if (typeof video.stage !== 'number') continue;
            const relative = video.file || `videos/${material.id}/${video.stage}.mp4`;
            if (!fs.existsSync(path.join(CONTENT_DIR, relative))) {
                problems.push(`${label}: vídeo não encontrado em content/${relative}`);
            }
        }
    }

    return problems;
}

// ---- Loading
function load() {
    if(!fs.existsSync(CONFIG_FILE)) {
        throw new Error('content/materials.json não encontrado.');
    }

    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    } catch (error) {
        throw new Error( `content/materials.json não é um JSON válido:\n  ${error.message}\n` +
        '  Dica: o engano mais comum é vírgula sobrando antes de } ou ].');
    }

    const problems = validate(raw);
    if (problems.length > 0) {
        throw new Error (
            `configuração inválida (${problems.length} problema(s)):\n` +
        problems.map((p) => `  - ${p}`).join('\n')    
        );
    }

    const settings = {
        resetDelaySeconds: raw.settings?.resetDelaySeconds ?? DEFAULT_RESET_DELAY,
        safetyMarginSeconds: raw.settings?.safetyMarginSeconds ?? DEFAULT_SAFETY_MARGIN
    }

    const enabled = raw.materials.filter((material) => material.enabled).sort((a,b) => a.order - b.order);

    const stages = [...raw.stages].sort((a,b) => a.number - b.number);

    return {
        settings,
        stages,
        materials: raw.materials,
        enabledMaterials: enabled,

        publicConfig() {
            return {
                stages: stages.map((stage) => ({
                    number: stage.number,
                    title: stage.title,
                    subtitle: stage.subtitle ?? null
                })),
                materials: enabled.map((material) => ({
                    id: material.id,
                    name: material.name,
                    tagline: material.tagline ?? null,
                    description: material.description,
                    color: material.color,
                    cardImage: material.cardImage,
                    order: material.order,
                    stageOverrides: material.stageOverrides ?? null
                }))
            }
        },

        findMaterial(materialId) {
            return enabled.find((material) => material.id === materialId) || null;
        },

        durationOf(materialId, stage) {
            const material = this.findMaterial(materialId)
            if (!material) return null
            const video = material.videos.find((item) => item.stage === stage)
            return video ? video.duration : null;
        }
    };
}

module.exports = {load, validate, CONTENT_DIR, CONFIG_FILE}