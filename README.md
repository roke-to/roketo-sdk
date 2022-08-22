# roketo-sdk

Just a first iteration. Docs TBA.

## Usage

Import API for fungible tokens from `roketo-sdk/ft`.

Import Roketo Streaming API from `roketo-sdk/roketo`.

> Note: SDK may require `core-js@3` in your project

## Release process

> Labels on PRs is used to set release version. Please, add labels BEFORE merge.

1. Check out the [draft release](https://github.com/roke-to/roketo-sdk/releases).
1. All PRs should have correct labels and useful titles. You can [review available labels here](https://github.com/roke-to/roketo-sdk/blob/master/.github/release-drafter.yml).
1. Update labels for PRs and titles, next [manually run the release drafter action](https://github.com/roke-to/roketo-sdk/actions/workflows/release-drafter.yml) to regenerate the draft release.
1. Review the new version and press "Publish"

# API

## Operations with streams

```ts
declare function addFunds({
  amount,
  streamId,
  callbackUrl,
  tokenAccountId,
  transactionMediator,
  roketoContractName,
  wNearId,
}: {
  /** amount is in yocto */
  amount: string;
  streamId: string;
  callbackUrl: string;
  tokenAccountId: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
  wNearId: string;
}): Promise<unknown>;
declare function startStream({
  streamId,
  transactionMediator,
  roketoContractName,
}: {
  streamId: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}): Promise<unknown>;
declare function pauseStream({
  streamId,
  transactionMediator,
  roketoContractName,
}: {
  streamId: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}): Promise<unknown>;
declare function stopStream({
  streamId,
  transactionMediator,
  roketoContractName,
}: {
  streamId: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}): Promise<unknown>;
declare function withdrawStreams({
  streamIds,
  transactionMediator,
  roketoContractName,
}: {
  streamIds: string[];
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}): Promise<unknown>;
declare function createStream({
  comment,
  deposit,
  receiverId,
  tokenAccountId,
  commissionOnCreate,
  tokensPerSec,
  cliffPeriodSec,
  delayed,
  isExpirable,
  isLocked,
  callbackUrl,
  color,
  accountId,
  tokenContract,
  transactionMediator,
  roketoContractName,
  wNearId,
  financeContractName,
}: {
  comment: string;
  deposit: string;
  commissionOnCreate: string;
  receiverId: string;
  tokenAccountId: string;
  tokensPerSec: string;
  name?: string;
  cliffPeriodSec?: number;
  delayed?: boolean;
  isExpirable?: boolean;
  isLocked?: boolean;
  callbackUrl?: string;
  color: string | null;
  accountId: string;
  tokenContract: FTContract;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
  wNearId: string;
  financeContractName: string;
}): Promise<unknown>;
```

## Data requests

```ts
declare function getStream({
  streamId,
  contract,
}: {
  streamId: string;
  contract: RoketoContract;
}): Promise<
  RoketoStream & {
    Err: never;
    Ok: RoketoStream;
  }
>;
declare function getIncomingStreams({
  from,
  limit,
  contract,
  accountId,
}: {
  from: number;
  limit: number;
  contract: RoketoContract;
  accountId: string;
}): Promise<RoketoStream[]>;
declare function getOutgoingStreams({
  from,
  limit,
  contract,
  accountId,
}: {
  from: number;
  limit: number;
  contract: RoketoContract;
  accountId: string;
}): Promise<RoketoStream[]>;
```

## Progress calculations

```ts
/**
 * @param config configuration object
 * @param config.stream stream to use
 * @param config.progressAtTimestamp calculate the progress at a certain point in time (current time by default).
 * For example it is used by notifications: they do not reflect the current state
 * of the stream, but only that, which was at the moment of their appearance,
 * so they use the moment of their creation on the server
 * and pass `stream.last_action` to `progressAtTimestamp`
 * @param config.asPercentage return result as percentage
 */
declare function getStreamProgress({
  stream,
  progressAtTimestamp,
  asPercentage,
}: {
  stream: RoketoStream;
  progressAtTimestamp?: number;
  asPercentage?: boolean;
}): {
  full: string;
  left: string;
  streamed: string;
  withdrawn: string;
  available: string;
};
declare function calculateEndTimestamp(stream: RoketoStream): number | null;
declare function calculateCliffEndTimestamp(
  stream: RoketoStream,
): number | null;
declare function calculateCliffPercent(stream: RoketoStream): number | null;
/**
 * @param progressAtTimestamp calculate the progress at a certain point in time (current time by default).
 * For example it is used by notifications: they do not reflect the current state
 * of the stream, but only that, which was at the moment of their appearance,
 * so they use the moment of their creation on the server
 * and pass `stream.last_action` to `progressAtTimestamp`
 */
declare function calculateTimeLeft(
  stream: RoketoStream,
  progressAtTimestamp?: number,
): string;
declare function formatTimeLeft(millisecondsLeft: number): string;
```

## Stream info

```ts
declare function isActiveStream(stream: RoketoStream): boolean;
declare function isPausedStream(stream: RoketoStream): boolean;
declare function isIdling(stream: RoketoStream): boolean;
declare function isDead(stream?: RoketoStream): boolean;
declare function isWithCliff(stream?: RoketoStream): boolean;
declare function hasPassedCliff(stream: RoketoStream): boolean;
/**
 * @param progressAtTimestamp calculate the progress at a certain point in time (current time by default).
 * For example it is used by notifications: they do not reflect the current state
 * of the stream, but only that, which was at the moment of their appearance,
 * so they use the moment of their creation on the server
 * and pass `stream.last_action` to `progressAtTimestamp`
 */
declare function getAvailableToWithdraw(
  stream: RoketoStream,
  progressAtTimestamp?: number,
): BigNumber;
declare function isLocked(stream: RoketoStream): boolean;
declare function wasStartedAndLocked(stream: RoketoStream): boolean;
declare function getStreamDirection(
  stream: RoketoStream,
  accountId: string | null,
): "IN" | "OUT" | null;
declare function getStreamLeftPercent(stream: RoketoStream): number;
declare function ableToAddFunds(
  stream: RoketoStream,
  accountId: string | null,
): boolean;
declare function ableToStartStream(
  stream: RoketoStream,
  accountId: string | null,
): boolean;
declare function ableToPauseStream(
  stream: RoketoStream,
  accountId: string | null,
): boolean;
declare function parseComment(description: string): string | null;
declare function parseColor(description: string): string | null;
```

## Application initialization

```ts
declare function initApiControl({
  account,
  transactionMediator,
  roketoContractName,
}: {
  account: Account;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}): Promise<ApiControl>;
```

## Other

```ts
declare function isWNearTokenId({
  tokenAccountId,
  wNearId,
}: {
  tokenAccountId: string;
  wNearId: string;
}): boolean;

declare function createRichContracts({
  tokensInfo,
  account,
}: {
  tokensInfo: Array<
    readonly [tokenAccountId: string, roketoMeta: RoketoTokenMeta]
  >;
  account: Account;
}): Promise<{
  [tokenId: string]: RichToken;
}>;

declare function transfer({
  payload,
  amount,
  callbackUrl,
  tokenContract,
  tokenAccountId,
  transactionMediator,
  roketoContractName,
  wNearId,
  financeContractName,
}: {
  payload: {
    description?: string;
    owner_id: string;
    receiver_id: string;
    balance: string;
    tokens_per_sec: string;
    cliff_period_sec?: number;
    is_auto_start_enabled?: boolean;
    is_expirable?: boolean;
    is_locked?: boolean;
  };
  amount: string;
  callbackUrl?: string;
  tokenContract: FTContract;
  tokenAccountId: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
  wNearId: string;
  financeContractName: string;
}): Promise<unknown>;
```

## Types

```ts
declare type StringInt = string;
declare type StreamId = string;
declare type AccountId = string;
declare type SafeFloat = {
  val: number;
  pow: number;
};
declare type StreamStatus =
  | "Initialized"
  | "Active"
  | "Paused"
  | {
      Finished: string;
    };
declare type RoketoStream = {
  balance: StringInt;
  cliff?: number;
  creator_id: AccountId;
  description: string;
  id: StreamId;
  is_expirable: boolean;
  is_locked: boolean;
  last_action: number;
  owner_id: AccountId;
  receiver_id: AccountId;
  status: StreamStatus;
  timestamp_created: number;
  token_account_id: AccountId;
  tokens_per_sec: StringInt;
  tokens_total_withdrawn: StringInt;
};
declare type TokenAmount = {
  [tokenAccountId: string]: StringInt;
};
declare type RoketoAccount = {
  active_incoming_streams: number;
  active_outgoing_streams: number;
  deposit: StringInt;
  inactive_incoming_streams: number;
  inactive_outgoing_streams: number;
  is_cron_allowed: boolean;
  last_created_stream: StreamId;
  stake: StringInt;
  total_incoming: TokenAmount;
  total_outgoing: TokenAmount;
  total_received: TokenAmount;
};
declare type RoketoTokenMeta = {
  account_id: AccountId;
  collected_commission: StringInt;
  commission_coef: SafeFloat;
  commission_on_create: StringInt;
  gas_for_ft_transfer: StringInt;
  gas_for_storage_deposit: StringInt;
  is_listed: boolean;
  storage_balance_needed: StringInt;
};
declare type RoketoDao = {
  commission_unlisted: StringInt;
  dao_id: AccountId;
  eth_near_ratio: SafeFloat;
  oracles: [];
  tokens: {
    [tokenAccountId: string]: RoketoTokenMeta;
  };
  utility_token_decimals: number;
  utility_token_id: AccountId;
};
declare type RoketoTokenStats = {
  active_streams: number;
  last_update_time: number;
  refunded: StringInt;
  streams: number;
  total_commission_collected: StringInt;
  total_deposit: StringInt;
  transferred: StringInt;
  tvl: StringInt;
};
declare type RoketoStats = {
  dao_tokens: {
    [tokenAccountId: string]: RoketoTokenStats;
  };
  last_update_time: number;
  total_account_deposit_eth: StringInt;
  total_account_deposit_near: StringInt;
  total_accounts: number;
  total_active_streams: number;
  total_aurora_streams: number;
  total_dao_tokens: number;
  total_streams: number;
  total_streams_unlisted: number;
};

declare type ContractChangeFunctionArgs<P> = {
  args: P;
  gas: string;
  amount: string;
  callbackUrl?: string;
};
declare type ContractResponse<R> = R & {
  Err: never;
  Ok: R;
};
declare type ContractViewFunction<P, R> = (json?: P) => Promise<R>;
declare type ContractChangeFunction<P> = (
  json: P | ContractChangeFunctionArgs<P>,
  gasSize?: string,
  deposit?: string,
) => Promise<void>;
declare type StreamsProps = {
  account_id: string;
  from: number;
  limit: number;
};
declare type AccountFTResponse = [
  total_incoming: string,
  total_outgoing: string,
  total_received: string,
];
declare type RoketoContract = Contract & {
  get_account: ContractViewFunction<
    {
      account_id: string;
    },
    ContractResponse<RoketoAccount>
  >;
  get_stream: ContractViewFunction<
    {
      stream_id: string;
    },
    ContractResponse<RoketoStream>
  >;
  get_account_incoming_streams: ContractViewFunction<
    StreamsProps,
    ContractResponse<RoketoStream[]>
  >;
  get_account_outgoing_streams: ContractViewFunction<
    StreamsProps,
    ContractResponse<RoketoStream[]>
  >;
  get_account_ft: ContractViewFunction<
    {
      account_id: string;
      token_account_id: string;
    },
    ContractResponse<AccountFTResponse>
  >;
  get_dao: ContractViewFunction<{}, RoketoDao>;
  get_token: ContractViewFunction<
    {
      token_account_id: string;
    },
    [RoketoTokenMeta, RoketoTokenStats]
  >;
  get_stats: ContractViewFunction<{}, RoketoStats>;
  withdraw: ContractChangeFunction<{
    stream_ids: string[];
  }>;
  start_stream: ContractChangeFunction<{
    stream_id: string;
  }>;
  pause_stream: ContractChangeFunction<{
    stream_id: string;
  }>;
  stop_stream: ContractChangeFunction<{
    stream_id: string;
  }>;
};

declare type TokenMetadata = {
  spec: null;
  name: string;
  symbol: string;
  icon: "";
  reference: null;
  reference_hash: null;
  decimals: number;
};
declare type FTContract = Contract & {
  ft_balance_of(options: { account_id: string }): Promise<string>;
  storage_balance_of(options: { account_id: string }): Promise<{
    total: string;
    available: string;
  }>;
  ft_metadata(): Promise<TokenMetadata>;
  near_deposit(options: {}, gas: string, deposit: string): Promise<unknown>;
  storage_deposit(
    options: {},
    gas: string,
    deposit: string | null,
  ): Promise<unknown>;
  ft_transfer_call({
    args,
    gas,
    callbackUrl,
    amount,
  }: {
    args: any;
    gas: string;
    callbackUrl: string;
    amount: number;
  }): Promise<unknown>;
};
declare type TransactionMediator<
  Act extends Action | Action$1 = Action | Action$1,
> = {
  functionCall(
    methodName: string,
    args: object | Uint8Array,
    gas: string,
    deposit: string,
  ): Act;
  signAndSendTransaction(params: {
    receiverId: string;
    actions: Act[];
    walletCallbackUrl?: string;
  }): Promise<unknown>;
};
declare type RichToken = {
  roketoMeta: RoketoTokenMeta;
  meta: TokenMetadata;
  balance: string;
  tokenContract: FTContract;
};
declare type ApiControl = {
  account: Account;
  transactionMediator: TransactionMediator;
  accountId: string;
  contract: RoketoContract;
  roketoAccount: RoketoAccount;
  dao: RoketoDao;
  tokens: {
    [tokenId: string]: RichToken;
  };
};
```
