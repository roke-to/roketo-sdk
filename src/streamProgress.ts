import { BigNumber } from "bignumber.js";
import { formatDuration, intervalToDuration } from "date-fns";

import type { RoketoStream } from "./roketo/interfaces/entities";
import { getAvailableToWithdraw, isIdling } from "./stream";
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

/**
 * @param progressAtTimestamp - calculate the progress at a certain point in time,
 * is used by notifications: they do not reflect the current state
 * of the stream, but only that, which was at the moment of their appearance,
 * so they use the moment of their creation on the server (`stream.last_action`)
 */
export function calculateTimeLeft(
  stream: RoketoStream,
  progressAtTimestamp: number = Date.now(),
) {
  const MAX_SEC = SECONDS_IN_YEAR * 1000;

  const availableToWithdraw = getAvailableToWithdraw(
    stream,
    progressAtTimestamp,
  );

  const balance = new BigNumber(stream.balance);

  const millisecondsLeft = BigNumber.minimum(
    MAX_SEC,
    balance
      .minus(availableToWithdraw)
      .dividedBy(stream.tokens_per_sec)
      .toFixed(0),
  )
    .multipliedBy(1000)
    .toNumber();

  const duration = intervalToDuration({ start: 0, end: millisecondsLeft });

  if (duration.days || duration.weeks || duration.months || duration.years) {
    duration.seconds = 0;
  }

  return formatDuration(duration, { locale: shortEnLocale });
}

/**
 * @param config configuration object
 * @param config.stream stream to use
 * @param config.progressAtTimestamp calculate the progress at a certain point in time,
 * is used by notifications: they do not reflect the current state
 * of the stream, but only that, which was at the moment of their appearance,
 * so they use the moment of their creation on the server (`stream.last_action`)
 * @param config.asPercentage return result as percentage
 */
export function getStreamProgress({
  stream,
  progressAtTimestamp = Date.now(),
  asPercentage = false,
}: {
  stream: RoketoStream;
  progressAtTimestamp?: number;
  asPercentage?: boolean;
}) {
  const availableToWithdraw = getAvailableToWithdraw(
    stream,
    progressAtTimestamp,
  );

  const balance = new BigNumber(stream.balance);

  /** progress bar calculations */
  const full = balance.plus(stream.tokens_total_withdrawn);
  const withdrawn = new BigNumber(stream.tokens_total_withdrawn);
  const streamed = withdrawn.plus(availableToWithdraw);
  const left = full.minus(streamed);

  if (asPercentage) {
    return {
      full: "100",
      left: String(left.multipliedBy(100).dividedBy(full).toNumber()),
      streamed: String(streamed.multipliedBy(100).dividedBy(full).toNumber()),
      withdrawn: String(withdrawn.multipliedBy(100).dividedBy(full).toNumber()),
      available: String(
        availableToWithdraw.multipliedBy(100).dividedBy(full).toNumber(),
      ),
    };
  }

  return {
    full: full.toFixed(0),
    withdrawn: withdrawn.toFixed(0),
    streamed: streamed.toFixed(0),
    left: left.toFixed(0),
    available: availableToWithdraw.toFixed(0),
  };
}
