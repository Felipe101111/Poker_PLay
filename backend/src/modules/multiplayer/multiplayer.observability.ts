type MultiplayerMetric =
  | 'action.accepted'
  | 'action.rejected'
  | 'socket.connected'
  | 'socket.disconnected'
  | 'table.reconnected'
  | 'timeout.folded'
  | 'table.closed';

export function recordMultiplayerMetric(metric: MultiplayerMetric, fields: Record<string, string | number>): void {
  console.info(JSON.stringify({ scope: 'multiplayer', metric, ...fields }));
}
