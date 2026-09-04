// ---- Server connection
// connect to server; keep the stage sync with server; auto reconnect if connection fail

import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientMessage, ServerMessage, PROTOCOL_VERSION } from './protocol';

const RECONNECT_MIN_MS = 500;
const RECONNECT_MAX_MS = 5000;

export function useServerState({ role, screen }) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const retryRef = useRef(RECONNECT_MIN_MS);
  const timerRef = useRef(null);
  const closedRef = useRef(false);

  // Send a message with connection is open
  const send = useCallback((type, payload = {}) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type, ...payload }));
    return true;
  }, []);

  useEffect(() => {
    closedRef.current = false;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        retryRef.current = RECONNECT_MIN_MS;
        socket.send(
          JSON.stringify({
            type: ClientMessage.HELLO,
            role,
            screen,
            protocolVersion: PROTOCOL_VERSION,
          }),
        );
      };

      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === ServerMessage.STATE) {
          setState(message);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        if (closedRef.current) return;

        timerRef.current = setTimeout(connect, retryRef.current);
        retryRef.current = Math.min(retryRef.current * 2, RECONNECT_MAX_MS);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      closedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [role, screen]);

  return { state, connected, send };
}
