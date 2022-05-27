import BigNumber from "bignumber.js";
import { millisecondsToSeconds } from "date-fns";

import { STREAM_STATUS } from "./constants";
import { RoketoStream, RoketoAccount } from "./interfaces/entities";

export const isActiveStream = (stream: RoketoStream) =>
  stream.status === STREAM_STATUS.Active;
export const isPausedStream = (stream: RoketoStream) =>
  stream.status === STREAM_STATUS.Paused;

export function isIdling(stream: RoketoStream) {
  return (
    stream.status === STREAM_STATUS.Initialized ||
    stream.status === STREAM_STATUS.Paused
  );
}

export function isDead(stream?: RoketoStream) {
  return (
    typeof stream?.status === "object" &&
    STREAM_STATUS.Finished in stream.status
  );
}

export function getAvailableToWithdraw(stream: RoketoStream): BigNumber {
  if (isIdling(stream)) {
    return new BigNumber(0);
  }

  const nowSec = millisecondsToSeconds(Date.now());
  const lastActionSec = fromNanosecToSec(stream.last_action);
  const period = nowSec - lastActionSec;

  return BigNumber.minimum(
    stream.balance,
    Number(stream.tokens_per_sec) * period,
  );
}

export const getEmptyAccount = (): RoketoAccount => ({
  active_incoming_streams: 0,
  active_outgoing_streams: 0,
  deposit: "0",
  inactive_incoming_streams: 0,
  inactive_outgoing_streams: 0,
  is_cron_allowed: true,
  last_created_stream: "any",
  stake: "0",
  total_incoming: {},
  total_outgoing: {},
  total_received: {},
});

const formatDistanceLocale = {
  xYears: "{{count}} years",
  xMonths: "{{count}} months",
  xDays: "{{count}}d",
  xSeconds: "{{count}}s",
  xMinutes: "{{count}}m",
  xHours: "{{count}}h",
} as const;

type TokenType = keyof typeof formatDistanceLocale;

export const shortEnLocale = {
  formatDistance: (token: TokenType, count: string) =>
    formatDistanceLocale[token].replace("{{count}}", count),
};

export function fromNanosecToSec(value: number | string) {
  return Number(value) / 1000 / 1000 / 1000;
}
