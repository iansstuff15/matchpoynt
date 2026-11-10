/**
 * How far this device's clock is from the API's, in ms (positive when the
 * device is behind). Ignores network latency, which is well under a second.
 */
export function clockOffset(serverTime: string, receivedAt: number): number {
  const server = Date.parse(serverTime)
  return Number.isNaN(server) || !receivedAt ? 0 : server - receivedAt
}
