import {
  addMonths,
  differenceInDays,
  formatDuration,
  intervalToDuration,
} from "date-fns";
import BigNumber from "bignumber.js";

import {
  RichToken,
  SECONDS_IN_DAY,
  SECONDS_IN_HOUR,
  SECONDS_IN_MINUTE,
  SECONDS_IN_YEAR,
} from "../ft";
import { RoketoStream } from "./interfaces/entities";
import { getAvailableToWithdraw, isDead, isIdling, shortEnLocale } from "./lib";

export function streamViewData(
  stream: RoketoStream,
  withExtrapolation: boolean = true,
) {
  const MAX_SEC = SECONDS_IN_YEAR * 1000;

  const availableToWithdraw = withExtrapolation
    ? getAvailableToWithdraw(stream)
    : new BigNumber(0);

  const secondsLeft = BigNumber.minimum(
    MAX_SEC,
    new BigNumber(stream.balance)
      .minus(availableToWithdraw)
      .dividedBy(stream.tokens_per_sec)
      .toFixed(),
  ).toNumber();

  const duration = intervalToDuration({ start: 0, end: secondsLeft * 1000 });

  if (duration.days || duration.weeks || duration.months || duration.years) {
    duration.seconds = 0;
  }

  const timeLeft = formatDuration(duration, { locale: shortEnLocale });

  const balance = new BigNumber(stream.balance);
  // progress bar calculations
  const full = balance.plus(stream.tokens_total_withdrawn);
  const withdrawn = new BigNumber(stream.tokens_total_withdrawn);
  const streamed = withdrawn.plus(availableToWithdraw);

  const left = full.minus(streamed);
  const progresses = [
    withdrawn.dividedBy(full).toNumber(),
    streamed.dividedBy(full).toNumber(),
  ];

  const percentages = {
    left: full.minus(streamed).dividedBy(full).toNumber(),
    streamed: streamed.dividedBy(full).toNumber(),
    withdrawn: withdrawn.dividedBy(full).toNumber(),
    available: availableToWithdraw.dividedBy(full).toNumber(),
  };

  return {
    secondsLeft,
    progresses,
    isDead: isDead(stream),
    percentages,
    timeLeft,
    streamEndInfo: calculateEndInfo(stream, balance),
    progress: {
      full: full.toFixed(),
      withdrawn: withdrawn.toFixed(),
      streamed: streamed.toFixed(),
      left: left.toFixed(),
      available: availableToWithdraw.toFixed(),
    },
  };
}

function calculateEndInfo(stream: RoketoStream, balance: BigNumber) {
  /**
   * if stream is not started yet or paused right now
   * then there is no way to calculate stream end time
   * */
  if (isIdling(stream)) return null;

  const tokensPerMs = new BigNumber(stream.tokens_per_sec).dividedBy(1000);
  const lastActionTime = stream.last_action / 1000000;

  const timeToCompleteEntireStream = balance.dividedBy(tokensPerMs).toNumber();
  /**
   * if this stream is active but 100% complete then it will be a time in the past
   * as well as in the case of "Finished" stream
   * othewise this stream is still working and this time will be in the future
   */
  return lastActionTime + timeToCompleteEntireStream;
}

export const getDurationInSeconds = (
  months: number,
  days: number,
  hours: number,
  minutes: number,
) => {
  const daysInMonths = differenceInDays(
    addMonths(new Date(), months),
    new Date(),
  );

  return (
    (daysInMonths + days) * SECONDS_IN_DAY +
    minutes * SECONDS_IN_MINUTE +
    hours * SECONDS_IN_HOUR
  );
};

export const getTokensPerSecondCount = (
  depositInYocto: string,
  durationInSeconds: number,
) => {
  const value = new BigNumber(depositInYocto)
    .dividedToIntegerBy(durationInSeconds)
    .toFixed();

  return value !== "Infinity" && value !== "NaN" ? value : "0";
};

export const getStreamingSpeed = (
  speedInSeconds: number,
  token: RichToken,
): string => {
  if (speedInSeconds <= 0) {
    return "none";
  }

  const { formatter, meta } = token;
  const { formattedValue, unit } =
    formatter.tokensPerMeaningfulPeriod(speedInSeconds);

  return `${formattedValue} ${meta.symbol} / ${unit}`;
};
