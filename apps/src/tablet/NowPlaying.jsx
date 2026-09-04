import { useEffect, useState } from 'react';

export default function NowPlaying({ material, stages, state }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const durations = material.durations ?? [];
  const total = durations.reduce((sum, value) => sum + value, 0);

  const before = durations.slice(0, Math.max(0, state.stage - 1)).reduce((sum, v) => sum + v, 0);
  const elapsedInStage = Math.max(0, (now - (state.startedAt ?? now)) / 1000);
  const currentDuration = durations[state.stage - 1] ?? 0;
  const elapsed = before + Math.min(elapsedInStage, currentDuration);

  const percent = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  const remaining = Math.max(0, Math.round(total - elapsed));

  return (
    <div className="playing" style={{ borderTopColor: material.color }}>
      <h1 className="playing__name">{material.name}</h1>
      <p className="playing__description">{material.description}</p>

      <ol className="steps">
        {stages.map((stage) => {
          const status =
            stage.number < state.stage ? 'done' : stage.number === state.stage ? 'current' : 'next';
          return (
            <li key={stage.number} className={`steps__item steps__item--${status}`}>
              <span
                className="steps__dot"
                style={status === 'current' ? { background: material.color } : undefined}
              />
              <span className="steps__label">{stage.title}</span>
            </li>
          );
        })}
      </ol>

      <div className="progress">
        <div
          className="progress__bar"
          style={{ width: `${percent}%`, background: material.color }}
        />
      </div>

      <p className="playing__hint">
        {remaining > 0 ? `Acompanhe nas telas · ${formatTime(remaining)} restantes` : 'Encerrando…'}
      </p>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${String(s).padStart(2, '0')}s` : `${s}s`;
}
