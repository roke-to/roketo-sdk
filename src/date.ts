import { formatDuration, intervalToDuration } from "date-fns";

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * 60;
const SECONDS_IN_DAY = SECONDS_IN_HOUR * 24;
const SECONDS_IN_WEEK = SECONDS_IN_DAY * 7;
const SECONDS_IN_MONTH = SECONDS_IN_WEEK * 4;
export const SECONDS_IN_YEAR = SECONDS_IN_MONTH * 12;

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
