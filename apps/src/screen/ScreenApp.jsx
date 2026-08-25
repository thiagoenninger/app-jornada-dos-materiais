// ---- All 4 screens use the same component

import { useEffect, useRef, useState } from "react";
import {useServerState} from '../shared/useServerState'
import { ClientMessage, Role, Status, STAGE_COUNT } from "../shared/protocol";
import WaitingScreen from './WaitingScreen'
import './screen.css'

function readScreenNumber() {
    const raw = new URLSearchParams(window.location.search).get('n')
    const value = Number(raw)
    if(!Number.isInteger(value) || value < 1 || value > STAGE_COUNT) return null
    return value
}

export default function ScreenApp() {
    const screenNumber = readScreenNumber()
    const {state, connected, send} = useServerState({
        role: Role.SCREEN,
        screen: screenNumber
    })

    const [config, setConfig] = useState(null)
    const [playbackError, setPlaybackError] = useState(null)
    const videoRef = useRef(null)

    // keep tab on the screens that have finished, to not send activate it twice
    const reportedRef = useRef(null)

    useEffect(() => {
        fetch('/api/config')
            .then((response) => response.json())
            .then(setConfig)
            .catch(() => setConfig(null))
    }, [])

    const isPlaying = state?.status === Status.PLAYING
    const isMyTurn = isPlaying && state.stage === screenNumber
    const materialId = state?.materialId ?? null

    // ---- Pre loading - no black screen, video starts immediately
    const videoSrc = materialId ? `/content/videos/${materialId}/${screenNumber}.mp4` : null;

    // ---- Play when it is its turn
    useEffect(() => {
    const video = videoRef.current
    if (!video) return;

    if (!isMyTurn) {
        if (!video.paused) video.pause()
        return
    }

    if (reportedRef.current === state.playbackId) return;

    setPlaybackError(null)

    const elapsed = Math.max(0, (state.serverTime - state.startedAt) / 1000)

    function start() {
        if (elapsed > 1 && video.duration && elapsed < video.duration) {
            video.currentTime = elapsed
        } else {
            video.currentTime = 0
        }
        video.play().catch(() => {
            video.muted = true
            video.play().catch((error) => {
                handleFailure(`não foi possível iniciar: ${error.message}`)
            })
        })
    }

    if (video.readyState >= 1) {
        start()
    } else {
        video.addEventListener('loadedmetadata', start, { once: true })
        return () => video.removeEventListener('loadedmetadata', start)
    }
}, [isMyTurn, state?.playbackId, state?.stage])

    const pendingRef = useRef(null)

    function handleEnded() {
        if (!state || reportedRef.current === state.playbackId) return;
        const report = { stage: screenNumber, playbackId: state.playbackId };
        if (send(ClientMessage.STAGE_FINISHED, report)) {
            reportedRef.current = state.playbackId;
        } else {
            pendingRef.current = report;
        }
    }

    useEffect(() => {
        if (connected && pendingRef.current) {
            if (send(ClientMessage.STAGE_FINISHED, pendingRef.current)) {
                reportedRef.current = pendingRef.current.playbackId;
                pendingRef.current = null;
            }
        }
    }, [connected, send])

    function handleFailure(reason) {
        if (!state || reportedRef.current === state.playbackId) return;
        reportedRef.current = state.playbackId
        setPlaybackError(reason)

        send(ClientMessage.STAGE_FAILED, {
            stage: screenNumber,
            playbackId: state.playbackId,
            reason
        })
    }

    // ---- invalid screen number
    if (screenNumber === null) {
        return (
            <div className="screen screen--error">
                <h1>Tela sem número</h1>
                <p>Abra esta página com o número da tela no endereço, de 1 a 4:</p>
                <code>/screen?n=1</code>
            </div>
        )
    }

    const stageInfo = config?.stages?.find((stage) => stage.number === screenNumber)

    return (
        <div className="screen">
            {videoSrc && (
                <video
                    ref={videoRef}
                    className={isMyTurn ? 'screen__video screen__video--visible' : 'screen__video'}
                    src={videoSrc}
                    preload="auto"
                    playsInline
                    onEnded={handleEnded}
                    onError={() => handleFailure('erro ao carregar o vídeo')}
                />
            )}

            {!isMyTurn && (
                <WaitingScreen
                    stageNumber={screenNumber}
                    stageTitle={stageInfo?.title}
                    stageSubtitle={stageInfo?.subtitle}
                />
            )}

            {playbackError && <div className="screen__error">{playbackError}</div>}

            <div className={connected ? 'screen__badge' : 'screen__badge screen__badge--off'}>
                tela {screenNumber}
                {!connected && ' . sem conexão'}
            </div>
        </div>
    )
}