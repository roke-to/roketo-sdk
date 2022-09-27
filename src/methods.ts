import { BigNumber } from "bignumber.js";
import { Account, Contract, utils } from "near-api-js";

import type { RoketoContract } from "./roketo/interfaces/contracts";
import type {
  RoketoAccount,
  RoketoStream,
  RoketoTokenMeta,
  RoketoDao,
} from "./roketo/interfaces/entities";
import type {
  ApiControl,
  FTContract,
  RichToken,
  TransactionMediator,
} from "./types";

export const GAS_SIZE = "200000000000000";
export const STORAGE_DEPOSIT = "0.0025";

export function isWNearTokenId({
  tokenAccountId,
  wNearId,
}: {
  tokenAccountId: string;
  wNearId: string;
}) {
  return tokenAccountId === wNearId;
}

export async function initApiControl({
  account,
  accountId,
  transactionMediator,
  roketoContractName,
}: {
  account: Account;
  accountId?: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}): Promise<ApiControl> {
  const currentAccountId = accountId || account.accountId;
  const contract = createRoketoContract({ account, roketoContractName });
  const [roketoAccount, dao] = await Promise.all([
    getAccount({ contract, accountId: currentAccountId }),
    getDao({ contract }),
  ]);
  const richTokens = await createRichContracts({
    account,
    accountId,
    tokensInfo: Object.entries(dao.tokens),
    dao,
  });
  return {
    account,
    accountId: currentAccountId,
    contract,
    roketoAccount,
    dao,
    tokens: richTokens,
    transactionMediator,
  };
}

export async function createRichContracts({
  tokensInfo,
  account,
  accountId,
  dao,
}: {
  tokensInfo: Array<
    readonly [tokenAccountId: string, roketoMeta: RoketoTokenMeta]
  >;
  account: Account;
  accountId?: string;
  dao: RoketoDao;
}): Promise<{
  [tokenId: string]: RichToken;
}> {
  const currentAccountId = accountId || account.accountId;
  return Object.fromEntries(
    await Promise.all(
      tokensInfo.map(async ([tokenAccountId, roketoMeta]) => {
        const tokenContract = createTokenContract({ account, tokenAccountId });
        const [meta, balance] = await Promise.all([
          getTokenMetadata({ tokenContract }),
          getBalance({ accountId: currentAccountId, tokenContract }),
        ]);

        const commission = roketoMeta.is_payment
          ? roketoMeta.commission_on_create
          : dao.commission_non_payment_ft;

        return [
          tokenAccountId,
          {
            roketoMeta,
            meta,
            balance,
            tokenContract,
            commission,
          },
        ];
      }),
    ),
  );
}

function createTokenContract({
  account,
  tokenAccountId,
}: {
  account: Account;
  tokenAccountId: string;
}) {
  return new Contract(account, tokenAccountId, {
    viewMethods: ["ft_balance_of", "ft_metadata", "storage_balance_of"],
    changeMethods: ["ft_transfer_call", "storage_deposit", "near_deposit"],
  }) as FTContract;
}

function createRoketoContract({
  account,
  roketoContractName,
}: {
  account: Account;
  roketoContractName: string;
}) {
  return new Contract(account, roketoContractName, {
    viewMethods: [
      "get_stats",
      "get_dao",
      "get_token",
      "get_stream",
      "get_account",
      "get_account_incoming_streams",
      "get_account_outgoing_streams",
      "get_account_ft",
    ],
    changeMethods: ["start_stream", "pause_stream", "stop_stream", "withdraw"],
  }) as RoketoContract;
}

async function isRegistered({
  accountId,
  tokenContract,
}: {
  accountId: string;
  tokenContract: FTContract;
}) {
  const res = await tokenContract.storage_balance_of({ account_id: accountId });
  return res && res.total !== "0";
}

function getTokenMetadata({ tokenContract }: { tokenContract: FTContract }) {
  return tokenContract.ft_metadata();
}

async function getBalance({
  accountId,
  tokenContract,
}: {
  accountId: string | null | void;
  tokenContract: FTContract;
}) {
  if (!accountId) return "0";
  return tokenContract.ft_balance_of({ account_id: accountId });
}

export function addFunds({
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
}) {
  const actions = [
    transactionMediator.functionCall(
      "ft_transfer_call",
      {
        receiver_id: roketoContractName,
        amount,
        memo: "Roketo transfer",
        msg: JSON.stringify({
          Deposit: {
            stream_id: streamId,
          },
        }),
      },
      "100000000000000",
      "1",
    ),
  ];
  if (isWNearTokenId({ tokenAccountId, wNearId: wNearId })) {
    actions.unshift(
      transactionMediator.functionCall(
        "near_deposit",
        {},
        "30000000000000",
        amount,
      ),
    );
  }
  return transactionMediator.signAndSendTransaction({
    receiverId: tokenAccountId,
    walletCallbackUrl: callbackUrl,
    actions,
  });
}

export async function transfer({
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
}) {
  const storageDepositAccountIds = [payload.owner_id, payload.receiver_id];

  const { isRegisteredAccountIds, depositSum, depositAmount } =
    await countStorageDeposit({
      tokenContract,
      storageDepositAccountIds,
      roketoContractName,
      financeContractName,
    });

  const actions = [
    transactionMediator.functionCall(
      "ft_transfer_call",
      {
        receiver_id: roketoContractName,
        amount: new BigNumber(amount).toFixed(0),
        memo: "Roketo transfer",
        msg: JSON.stringify({
          Create: {
            request: payload,
          },
        }),
      },
      "100000000000000",
      "1",
    ),
  ];

  storageDepositAccountIds.forEach((accountId, index) => {
    if (!isRegisteredAccountIds[index]) {
      actions.unshift(
        transactionMediator.functionCall(
          "storage_deposit",
          { account_id: accountId, registration_only: true },
          "30000000000000",
          depositAmount,
        ),
      );
    }
  });

  if (isWNearTokenId({ tokenAccountId, wNearId })) {
    actions.unshift(
      transactionMediator.functionCall(
        "near_deposit",
        {},
        "30000000000000",
        new BigNumber(amount).plus(depositSum).toFixed(0),
      ),
    );
  }

  return transactionMediator.signAndSendTransaction({
    receiverId: tokenAccountId,
    walletCallbackUrl: callbackUrl,
    actions,
  });
}

export async function countStorageDeposit({
  tokenContract,
  storageDepositAccountIds,
  roketoContractName,
  financeContractName,
}: {
  tokenContract: FTContract;
  storageDepositAccountIds: Array<string>;
  roketoContractName: string;
  financeContractName: string;
}) {
  const allAccountIds = [
    ...storageDepositAccountIds,
    roketoContractName,
    financeContractName,
  ];

  const isRegisteredAccountIds = await Promise.all(
    allAccountIds.map((accountId) =>
      isRegistered({ accountId, tokenContract }),
    ),
  );

  let depositSum = new BigNumber(0);
  /** account creation costs 0.0025 NEAR for storage */
  const depositAmount = utils.format.parseNearAmount(STORAGE_DEPOSIT)!;

  allAccountIds.forEach((accountId, index) => {
    if (!isRegisteredAccountIds[index])
      depositSum = depositSum.plus(depositAmount);
  });

  return {
    isRegisteredAccountIds,
    depositSum,
    depositAmount,
  };
}

async function getAccount({
  contract,
  accountId,
}: {
  contract: RoketoContract;
  accountId?: string | null | void;
}): Promise<RoketoAccount> {
  const emptyAccount = {
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
  };
  if (!accountId) return emptyAccount;
  return contract
    .get_account({ account_id: accountId })
    .catch(() => emptyAccount);
}

export function getDao({ contract }: { contract: RoketoContract }) {
  return contract.get_dao();
}

export function getStream({
  streamId,
  contract,
}: {
  streamId: string;
  contract: RoketoContract;
}) {
  return contract.get_stream({ stream_id: streamId });
}

function createChangeFunctionCall(
  mediator: TransactionMediator,
  methodName: string,
  args: object | Uint8Array,
  gas: string,
  deposit: string,
  roketoContractName: string,
) {
  return mediator.signAndSendTransaction({
    receiverId: roketoContractName,
    actions: [mediator.functionCall(methodName, args, gas, deposit)],
  });
}

export function startStream({
  streamId,
  transactionMediator,
  roketoContractName,
}: {
  streamId: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}) {
  return createChangeFunctionCall(
    transactionMediator,
    "start_stream",
    { stream_id: streamId },
    GAS_SIZE,
    "1",
    roketoContractName,
  );
}

export function pauseStream({
  streamId,
  transactionMediator,
  roketoContractName,
}: {
  streamId: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}) {
  return createChangeFunctionCall(
    transactionMediator,
    "pause_stream",
    { stream_id: streamId },
    GAS_SIZE,
    "1",
    roketoContractName,
  );
}

export function stopStream({
  streamId,
  transactionMediator,
  roketoContractName,
}: {
  streamId: string;
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}) {
  return createChangeFunctionCall(
    transactionMediator,
    "stop_stream",
    { stream_id: streamId },
    GAS_SIZE,
    "1",
    roketoContractName,
  );
}

export function withdrawStreams({
  streamIds,
  transactionMediator,
  roketoContractName,
}: {
  streamIds: string[];
  transactionMediator: TransactionMediator;
  roketoContractName: string;
}) {
  return createChangeFunctionCall(
    transactionMediator,
    "withdraw",
    { stream_ids: streamIds },
    GAS_SIZE,
    "1",
    roketoContractName,
  );
}

export function createStream({
  comment,
  deposit,
  receiverId,
  tokenAccountId,
  commissionOnCreate,
  tokensPerSec,
  cliffPeriodSec,
  delayed = false,
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
}) {
  const totalAmount = new BigNumber(deposit)
    .plus(commissionOnCreate)
    .toFixed(0);
  const transferPayload = {
    balance: deposit,
    owner_id: accountId,
    receiver_id: receiverId,
    token_name: tokenAccountId,
    tokens_per_sec: tokensPerSec,
    cliff_period_sec: cliffPeriodSec,
    is_locked: isLocked,
    is_auto_start_enabled: !delayed,
    is_expirable: isExpirable,
  };
  if (color || comment.length > 0) {
    const description: { c?: string; col?: string } = {};
    if (color) description.col = color;
    if (comment.length > 0) description.c = comment;
    // @ts-expect-error
    transferPayload.description = JSON.stringify(description);
  }

  return transfer({
    payload: transferPayload,
    amount: totalAmount,
    callbackUrl,
    tokenContract,
    tokenAccountId,
    transactionMediator,
    roketoContractName,
    wNearId,
    financeContractName,
  });
}

export function getIncomingStreams({
  from,
  limit,
  contract,
  accountId,
}: {
  from: number;
  limit: number;
  contract: RoketoContract;
  accountId: string;
}): Promise<RoketoStream[]> {
  return contract
    .get_account_incoming_streams({ account_id: accountId, from, limit })
    .catch(() => []);
}

export function getOutgoingStreams({
  from,
  limit,
  contract,
  accountId,
}: {
  from: number;
  limit: number;
  contract: RoketoContract;
  accountId: string;
}): Promise<RoketoStream[]> {
  return contract
    .get_account_outgoing_streams({ account_id: accountId, from, limit })
    .catch(() => []);
}
