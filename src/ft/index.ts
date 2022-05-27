import { Account, Contract, transactions, utils } from "near-api-js";
import BigNumber from "bignumber.js";
import JSONBigInt from "json-bigint";

import {
  RoketoCreateRequest,
  TokenMetadata,
  RoketoTokenMeta,
  RoketoDao,
} from "./entities";

import { TokenFormatter } from "./token-formatter";
export * from "./token-formatter";
export * from "./entities";

export type RichToken = {
  api: FTApi;
  roketoMeta: RoketoTokenMeta;
  formatter: TokenFormatter;
  meta: TokenMetadata;
  balance: string;
};

export type RichTokens = {
  [tokenAccountId: string]: RichToken;
};

type InitFRProps = {
  account: Account;
  tokens: RoketoDao["tokens"];
};

export async function initFT({ account, tokens }: InitFRProps) {
  const richTokens: RichTokens = {};

  await Promise.all(
    Object.keys(tokens).map(async (tokenAccountId: string) => {
      const api = new FTApi(account, tokenAccountId);
      const [meta, balance] = await Promise.all([
        api.getMetadata(),
        api.getBalance(),
      ]);
      const formatter = new TokenFormatter(meta.decimals);

      richTokens[tokenAccountId] = {
        api,
        formatter,
        roketoMeta: tokens[tokenAccountId],
        meta,
        balance,
      };
    }),
  );

  return richTokens;
}

type FTContract = Contract & {
  ft_balance_of: (options: { account_id: string }) => Promise<string>;
  storage_balance_of: (options: {
    account_id: string;
  }) => Promise<{ total: string; available: string }>;
  ft_metadata: () => Promise<TokenMetadata>;
  near_deposit: (options: {}, gas: string, deposit: string) => Promise<void>;
  storage_deposit: (
    options: {},
    gas: string,
    deposit: string | null,
  ) => Promise<void>;
  ft_transfer_call: ({
    args,
    gas,
    callbackUrl,
    amount,
  }: {
    args: any;
    gas: string;
    callbackUrl: string;
    amount: number;
  }) => Promise<void>;
};

export class FTApi {
  contract: FTContract;

  constructor(
    private account: Account,
    private tokenAccountId: string,
    private isWrappedNearToken = false,
    private roketoContractName = "streaming.r-v2.near",
  ) {
    this.contract = new Contract(account, tokenAccountId, {
      viewMethods: ["ft_balance_of", "ft_metadata", "storage_balance_of"],
      changeMethods: ["ft_transfer_call", "storage_deposit", "near_deposit"],
    }) as FTContract;
  }

  async getMetadata(): Promise<TokenMetadata> {
    return this.contract.ft_metadata();
  }

  async getBalance(): Promise<string> {
    if (!this.account.accountId) {
      return "0";
    }

    return this.contract.ft_balance_of({
      account_id: this.account.accountId,
    });
  }

  async getIsRegistered(accountId: string): Promise<boolean> {
    const balance = await this.contract.storage_balance_of({
      account_id: accountId,
    });

    return balance && balance.total !== "0";
  }

  transfer = async (
    payload: RoketoCreateRequest,
    amount: string,
    callbackUrl?: string,
  ) => {
    const [isRegisteredSender, isRegisteredReceiver] = await Promise.all([
      this.getIsRegistered(payload.owner_id),
      this.getIsRegistered(payload.receiver_id),
    ]);

    const actions = [
      transactions.functionCall(
        "ft_transfer_call",
        {
          receiver_id: this.roketoContractName,
          amount: new BigNumber(amount).toFixed(),
          memo: "Roketo transfer",
          msg: JSONBigInt.stringify({
            Create: {
              request: payload,
            },
          }),
        },
        "100000000000000",
        1,
      ),
    ];

    let depositSumm = new BigNumber(0);
    const depositAmmount = utils.format.parseNearAmount("0.00125") as string; // account creation costs 0.00125 NEAR for storage

    if (!isRegisteredSender) {
      actions.unshift(
        transactions.functionCall(
          "storage_deposit",
          { account_id: payload.owner_id },
          "30000000000000",
          depositAmmount,
        ),
      );

      depositSumm = depositSumm.plus(depositAmmount);
    }

    if (!isRegisteredReceiver) {
      actions.unshift(
        transactions.functionCall(
          "storage_deposit",
          { account_id: payload.receiver_id },
          "30000000000000",
          depositAmmount,
        ),
      );

      depositSumm = depositSumm.plus(depositAmmount);
    }

    if (this.isWrappedNearToken) {
      actions.unshift(
        transactions.functionCall(
          "near_deposit",
          {},
          "30000000000000",
          new BigNumber(amount).plus(depositSumm).toFixed(),
        ),
      );
    }

    // @ts-ignore
    return this.account.signAndSendTransaction({
      receiverId: this.tokenAccountId,
      walletCallbackUrl: callbackUrl,
      actions,
    });
  };
}
