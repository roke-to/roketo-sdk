import { Account } from "near-api-js";
import BigNumber from "bignumber.js";

import { RoketoContract } from "./interfaces/contracts";
import { RoketoAccount, RoketoStream } from "./interfaces/entities";
import {
  CreateStreamApiProps,
  RoketoApi,
  StreamsProps,
} from "./interfaces/roketo-api";
import { getEmptyAccount } from "./lib";

const GAS_SIZE = "200000000000000";

type NewRoketoApiProps = {
  account: Account;
  contract: RoketoContract;
};

export class RoketoContractApi implements RoketoApi {
  contract: RoketoContract;

  account: Account;

  constructor({ contract, account }: NewRoketoApiProps) {
    this.contract = contract;
    this.account = account;
  }

  async getAccount(): Promise<RoketoAccount> {
    if (!this.account.accountId) {
      return getEmptyAccount();
    }

    try {
      return await this.contract.get_account({
        account_id: this.account.accountId,
      });
    } catch {
      return getEmptyAccount();
    }
  }

  async getAccountIncomingStreams({
    from,
    limit,
  }: StreamsProps): Promise<RoketoStream[]> {
    try {
      return await this.contract.get_account_incoming_streams({
        account_id: this.account.accountId,
        from,
        limit,
      });
    } catch {
      return [];
    }
  }

  async getAccountOutgoingStreams({
    from,
    limit,
  }: StreamsProps): Promise<RoketoStream[]> {
    try {
      return await this.contract.get_account_outgoing_streams({
        account_id: this.account.accountId,
        from,
        limit,
      });
    } catch {
      return [];
    }
  }

  async getStream({ streamId }: { streamId: string }) {
    return this.contract.get_stream({
      stream_id: streamId,
    });
  }

  async getDao() {
    return this.contract.get_dao();
  }

  async createStream({
    comment,
    deposit,
    receiverId,
    tokenAccountId,
    commissionOnCreate,
    tokensPerSec,
    cliffPeriodSec,
    isAutoStart = true,
    isExpirable,
    isLocked,
    callbackUrl,
    handleTransferStream,
  }: CreateStreamApiProps) {
    const totalAmount = new BigNumber(deposit)
      .plus(commissionOnCreate)
      .toFixed();

    const transferPayload = {
      description: JSON.stringify({ comment }),
      balance: deposit,
      owner_id: this.account.accountId,
      receiver_id: receiverId,
      token_name: tokenAccountId,
      tokens_per_sec: BigInt(tokensPerSec),
      cliff_period_sec: cliffPeriodSec,
      is_locked: isLocked,
      is_auto_start_enabled: isAutoStart,
      is_expirable: isExpirable,
    };

    return handleTransferStream(transferPayload, totalAmount, callbackUrl);
  }

  async startStream({ streamId }: { streamId: string }) {
    return this.contract.start_stream({ stream_id: streamId }, GAS_SIZE, "1");
  }

  async pauseStream({ streamId }: { streamId: string }) {
    return this.contract.pause_stream({ stream_id: streamId }, GAS_SIZE, "1");
  }

  async stopStream({ streamId }: { streamId: string }) {
    return this.contract.stop_stream({ stream_id: streamId }, GAS_SIZE, "1");
  }

  async withdraw({ streamIds }: { streamIds: string[] }) {
    return this.contract.withdraw({ stream_ids: streamIds }, GAS_SIZE, "1");
  }
}
