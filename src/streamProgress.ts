import { BigNumber } from "bignumber.js";
import { formatDuration, intervalToDuration } from "date-fns";

import type { RoketoStream } from "./roketo/interfaces/entities";
import { getAvailableToWithdraw, isDead, isIdling } from "./stream";
import { SECONDS_IN_YEAR, shortEnLocale } from "./date";

export function calculateEndTimestamp(stream: RoketoStream) {
  /**
   * if stream is not started yet or paused right now
   * then there is no way to calculate stream end time
   * */
  if (isIdling(stream)) return null;

  const tokensPerMs = new BigNumber(stream.tokens_per_sec).dividedBy(1000);
  const lastActionTime = stream.last_action / 1000_000;

  const timeToCompleteEntireStream = new BigNumber(stream.balance)
    .dividedBy(tokensPerMs)
    .toNumber();
  /**
   * if this stream is active but 100% complete then it will be a time in the past
   * as well as in the case of "Finished" stream
   * othewise this stream is still working and this time will be in the future
   */
  return lastActionTime + timeToCompleteEntireStream;
}

export function calculateCliffEndTimestamp(stream: RoketoStream) {
  return stream.cliff ? +stream.cliff / 1000_000 : null;
}

function calculateCliffPercent(stream: RoketoStream) {
  if (!stream.cliff) {
    return null;
  }

  const endTimestamp = calculateEndTimestamp(stream);

  if (!endTimestamp) {
    return null;
  }

  const cliffDurationMs = (+stream.cliff - stream.timestamp_created) / 1000_000;

  const streamDurationMs = endTimestamp - stream.timestamp_created / 1000_000;

  return (cliffDurationMs / streamDurationMs) * 100;
}

export function formatTimeLeft(millisecondsLeft: number) {
  const duration = intervalToDuration({ start: 0, end: millisecondsLeft });

  if (duration.days || duration.weeks || duration.months || duration.years) {
    duration.seconds = 0;
  }

  return formatDuration(duration, { locale: shortEnLocale });
}

export function getStreamProgressPercentages(
  stream: RoketoStream,
  withExtrapolation: boolean = true,
) {
  const availableToWithdraw = withExtrapolation
    ? getAvailableToWithdraw(stream)
    : new BigNumber(0);

  const balance = new BigNumber(stream.balance);

  /** progress bar calculations */
  const full = balance.plus(stream.tokens_total_withdrawn);
  const withdrawn = new BigNumber(stream.tokens_total_withdrawn);
  const streamed = withdrawn.plus(availableToWithdraw);

  return {
    left: full.minus(streamed).multipliedBy(100).dividedBy(full).toNumber(),
    streamed: streamed.multipliedBy(100).dividedBy(full).toNumber(),
    withdrawn: withdrawn.multipliedBy(100).dividedBy(full).toNumber(),
    available: availableToWithdraw.multipliedBy(100).dividedBy(full).toNumber(),
    cliff: calculateCliffPercent(stream),
  };
}

export function streamViewData(
  stream: RoketoStream,
  withExtrapolation: boolean = true,
) {
  const MAX_SEC = SECONDS_IN_YEAR * 1000;

  const availableToWithdraw = withExtrapolation
    ? getAvailableToWithdraw(stream)
    : new BigNumber(0);

  const balance = new BigNumber(stream.balance);

  const secondsLeft = BigNumber.minimum(
    MAX_SEC,
    balance
      .minus(availableToWithdraw)
      .dividedBy(stream.tokens_per_sec)
      .toFixed(),
  ).toNumber();

  /** progress bar calculations */
  const full = balance.plus(stream.tokens_total_withdrawn);
  const withdrawn = new BigNumber(stream.tokens_total_withdrawn);
  const streamed = withdrawn.plus(availableToWithdraw);

  const left = full.minus(streamed);

  return {
    isDead: isDead(stream),
    percentages: getStreamProgressPercentages(stream, withExtrapolation),
    timeLeft: formatTimeLeft(secondsLeft * 1000),
    streamEndTimestamp: calculateEndTimestamp(stream),
    cliffEndTimestamp: calculateCliffEndTimestamp(stream),
    progress: {
      full: full.toFixed(),
      withdrawn: withdrawn.toFixed(),
      streamed: streamed.toFixed(),
      left: left.toFixed(),
      available: availableToWithdraw.toFixed(),
    },
  };
}
