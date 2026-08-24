// ---- Stages and relé rules

const {Status, STAGE_COUNT} = require('./protocol')

function createStateMachine({config, logger, onChange}) {

    // ---- Intern Stage
    let status = Status.IDLE;
    let materialId = null;
    let stage = 0;
    let playbackId = 0;
    let startedAt = null;

    // ---- Ongoin stages
    let journeyStartedAt = null;
    let journeyWarnings = 0;

    let safetyTimer = null;
    let resetTimer = null;

    // ---- Timers
    function clearSafetyTimer() {
        if (safetyTimer) {
            clearTimeout(safetyTimer)
            safetyTimer = null;
        }
    }

    function clearResetTimer() {
        if (resetTimer) {
            clearTimeout(resetTimer)
            resetTimer = null;
        }
    }

    // ---- Safety net: if the screen freezes and don't notifies that is has finished, the server waits for the duration of the video plus a margin of seconds to advance and not remain frozen
    function armSafetyTimer() {
        clearSafetyTimer();

        const duration = config.durationOf(materialId, stage)
        if (duration === null) {
            logger.error('duração não encontrada para o cronômetro de segurança', {material: materialId, stage})
            return
        }

        const limitMs = (duration + config.settings.safetyMarginSeconds) * 1000;
        const firedFor = {playbackId, stage}

        safetyTimer = setTimeout (() => {
            if (playbackId !== firedFor.playbackId || stage !== firedFor.stage) return;
            
            journeyWarnings += 1;
            logger.warn('cronômetro de segurança disparou', {
                material: materialId,
                stage,
                playbackId
            });
            advance()
        }, limitMs);
    }

    // ---- Transitions
    function notify() {
        if (onChange) onChange(getState());
    }

    function goIdle() {
        clearSafetyTimer()
        clearResetTimer()
        status = Status.IDLE
        materialId = null
        stage = 0
        startedAt = null
        journeyStartedAt = null
        journeyWarnings = 0
        notify()
    }

    function finishJourney() {
        clearSafetyTimer()

        logger.info('jornada concluída', {
            material: materialId,
            playbackId,
            alertas: journeyWarnings
        })
        logger.usage(materialId, journeyStartedAt, true, journeyWarnings)

        status = Status.RESETTING
        startedAt = Date.now()
        notify()

        clearResetTimer()
        const delayMs = config.settings.resetDelaySeconds * 1000
        const firedFor = playbackId

        resetTimer = setTimeout (() => {
            if (playbackId !== firedFor) return;
            logger.info('voltando ao estado inicial')
            goIdle()
        }, delayMs);
    }

    // ---- Advance to the next stage of finish it if it was the last stage
    function advance() {
        if (status !== Status.PLAYING) return;

        if (stage < STAGE_COUNT) {
            stage += 1;
            startedAt = Date.now();
            logger.info('etapa iniciada', {material: materialId, stage, playbackId})
            armSafetyTimer();
            notify();
        } else {
            finishJourney();
        }
    }

    // ---- Public State
    function getState() {
        return {
            status,
            materialId,
            stage,
            playbackId,
            startedAt,
            serverTime: Date.now()
        }
    }

    // ---- Client events
    // ---- the Block rules stays on the server, not on the interface
    function selectMaterial(requestedId) {
        if (status !== Status.IDLE) {
            logger.info('seleção recusada: já existe uma jornada em andamento', {
                pedido: requestedId,
                status
            });
            return {accepted: false, reason: 'sistema ocupado'};
        }

        const material = config.findMaterial(requestedId)
        if (!material) {
            logger.warn('seleção recusada: material desconhecido ou desabilitado', {
                pedido: requestedId
            });
            return {accepted: false, reason: 'material não disponível'}
        }

        playbackId += 1;
        status = Status.PLAYING;
        materialId = material.id;
        stage = 1;
        startedAt = Date.now();
        journeyStartedAt = startedAt;
        journeyWarnings = 0;

        logger.info('jornada iniciada', {material: materialId, playbackId});
        logger.info('etapa iniciada', {material: materialId, stage, playbackId});

        armSafetyTimer();
        notify();

        return {accepted: true};
    }


    // ---- One screen is finished, it is only accepted if the playbackId and the sate are at the same state
    function stageFinished(reportedStage, reportedPlaybackId) {
        if (status !== Status.PLAYING) {
            logger.info('aviso de fim ignorado: não há jornada tocando', {
                stage: reportedStage
            });
            return {accepted: false}
        }

        if (reportedPlaybackId !== playbackId || reportedStage !== stage) {
            logger.info('aviso do fim ignorado: mensagem atrasada', {
                recebido: `stage=${reportedStage} playbackId=${reportedPlaybackId}`,
                atual: `stage=${stage} playbackId=${playbackId}`
            });
            return {accepted: false}
        }

        logger.info('etapa concluída', {material: materialId, stage, playbackId});
        advance();
        return {accepted: true};
    }

    // ---- The screen could not reproduce the video, we register the error and move on to the next screen
    function stageFailed(reportedStage, reportedPlaybackId, reason) {
        if (status !== Status.PLAYING) return {accepted: false};

        if (reportedPlaybackId !== playbackId || reportedStage !== stage) {
            info.logger('aviso de falha ignorado: mensagem atrasada', {
                recebido: `stage=${reportedStage} playbackId=${reportedPlaybackId}`
            });
            return {accepted: false}
        }

        journeyWarnings += 1;
        logger.error('tela não conseguiu tocar o vídeo', {
            material: materialId,
            stage,
            playbackId,
            motivo: reason || 'não informado'
        });
        advance();
        return { accepted: true}
    }

    // ---- Clean stop: used in tests and to turn off the server.
    function stop() {
        clearSafetyTimer();
        clearResetTimer();
    }

    return {
        getState,
        selectMaterial,
        stageFailed,
        stageFinished,
        stop
    }
}

module.exports = {createStateMachine}