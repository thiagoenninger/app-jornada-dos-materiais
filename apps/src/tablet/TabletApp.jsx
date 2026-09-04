import { useEffect, useState } from 'react';
import { useServerState } from '../shared/useServerState.js';
import { ClientMessage, Role, Status } from '../shared/protocol.js';
import MaterialGrid from './MaterialGrid.jsx';
import NowPlaying from './NowPlaying.jsx';
import './tablet.css';

export default function TabletApp() {
  const { state, connected, send } = useServerState({ role: Role.TABLET });
  const [config, setConfig] = useState(null);
  const [pressedId, setPressedId] = useState(null);

  useEffect(() => {
    fetch('/api/config')
      .then((response) => response.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const busy = state?.status === Status.PLAYING || state?.status === Status.RESETTING;
  const material = config?.materials?.find((item) => item.id === state?.materialId) ?? null;

  function choose(id) {
    if (busy || !connected) return;
    setPressedId(id);
    send(ClientMessage.SELECT_MATERIAL, { materialId: id });
  }

  useEffect(() => {
    if (!busy) setPressedId(null);
  }, [busy]);

  if (!config) {
    return (
      <div className="tablet tablet--loading">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="tablet">
      {busy && material ? (
        <NowPlaying material={material} stages={config.stages} state={state} />
      ) : (
        <MaterialGrid
          materials={config.materials}
          onChoose={choose}
          pressedId={pressedId}
          disabled={!connected}
        />
      )}

      {!connected && <div className="tablet__offline">sem conexão com o sistema</div>}
    </div>
  );
}
