const PROTOCOL_VERSION = 1;

const ClientMessage = {
  HELLO: 'hello',
  SELECT_MATERIAL: 'selectMaterial',
  STAGE_FINISHED: 'stageFinished',
  STAGE_FAILED: 'stageFailed',
};

const ServerMessage = {
  STATE: 'state',
  ERROR: 'error',
};

const Status = { IDLE: 'idle', PLAYING: 'playing', RESETTING: 'resetting' };

const Role = {
  TABLET: 'tablet',
  SCREEN: 'screen',
};

const STAGE_COUNT = 4;

module.exports = {
  PROTOCOL_VERSION,
  ClientMessage,
  ServerMessage,
  Status,
  Role,
  STAGE_COUNT,
};
