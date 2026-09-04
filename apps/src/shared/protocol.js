export const PROTOCOL_VERSION = 1;

export const ClientMessage = {
  HELLO: 'hello',
  SELECT_MATERIAL: 'selectMaterial',
  STAGE_FINISHED: 'stageFinished',
  STAGE_FAILED: 'stageFailed',
};

export const ServerMessage = {
  STATE: 'state',
  ERROR: 'error',
};

export const Status = {
  IDLE: 'idle',
  PLAYING: 'playing',
  RESETTING: 'resetting',
};

export const Role = {
  TABLET: 'tablet',
  SCREEN: 'screen',
};

export const STAGE_COUNT = 4;
