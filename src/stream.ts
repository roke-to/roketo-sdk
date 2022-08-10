import { BigNumber } from "bignumber.js";
import { millisecondsToSeconds } from "date-fns";

import { fromNanosecToSec } from "./date";

import type { RoketoStream } from "./roketo/interfaces/entities";

export const isActiveStream = (stream: RoketoStream) =>
  stream.status === "Active";
export const isPausedStream = (stream: RoketoStream) =>
  stream.status === "Paused";

export function isIdling(stream: RoketoStream) {
  return stream.status === "Initialized" || stream.status === "Paused";
}

export function isDead(stream?: RoketoStream) {
  return typeof stream?.status === "object" && "Finished" in stream.status;
}

export function isWithCliff(stream?: RoketoStream) {
  return Boolean(stream?.cliff);
}

export function hasPassedCliff(stream: RoketoStream) {
  return !stream.cliff || Date.now() > +stream.cliff / 1000_000;
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

export function isLocked(stream: RoketoStream) {
  return stream.is_locked;
}

export function wasStartedAndLocked(stream: RoketoStream) {
  return isLocked(stream) && stream.status !== "Initialized";
}

export function getStreamDirection(
  stream: RoketoStream,
  accountId: string | null,
) {
  if (stream.receiver_id === accountId) {
    return "IN";
  }
  if (stream.owner_id === accountId) {
    return "OUT";
  }
  return null;
}

export function getStreamLeftPercent(stream: RoketoStream) {
  const full = new BigNumber(stream.balance).plus(
    stream.tokens_total_withdrawn,
  );
  const availableToWithdraw = getAvailableToWithdraw(stream);
  const withdrawn = new BigNumber(stream.tokens_total_withdrawn);
  const streamed = withdrawn.plus(availableToWithdraw);
  return full.minus(streamed).multipliedBy(100).dividedBy(full).toNumber();
}

export function ableToAddFunds(stream: RoketoStream, accountId: string | null) {
  const direction = getStreamDirection(stream, accountId);
  const isOutgoingStream = direction === "OUT";
  const isStreamEnded = getStreamLeftPercent(stream) === 0;
  return (
    isOutgoingStream &&
    !isLocked(stream) &&
    !isStreamEnded &&
    hasPassedCliff(stream)
  );
}

export function ableToStartStream(
  stream: RoketoStream,
  accountId: string | null,
) {
  const isOutgoingStream = accountId === stream.owner_id;
  return stream.status !== "Active" && isOutgoingStream;
}

export function ableToPauseStream(
  stream: RoketoStream,
  accountId: string | null,
) {
  const direction = getStreamDirection(stream, accountId);
  return !!direction && stream.status === "Active" && !isWithCliff(stream);
}

export function parseComment(description: string): string | null {
  let comment = "";

  try {
    const parsedDescription = JSON.parse(description);
    comment = parsedDescription.comment ?? parsedDescription.c;
  } catch {
    comment = description;
  }

  return comment ?? null;
}

export function parseColor(description: string): string | null {
  let color = "transparent";

  try {
    const parsedDescription = JSON.parse(description);
    color = parsedDescription.col;
    // eslint-disable-next-line no-empty
  } catch {}

  return color ?? null;
}
