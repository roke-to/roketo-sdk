import * as nearAPI from "near-api-js";
import { Account } from "near-api-js";

import { RoketoContract } from "./interfaces/contracts";
import { RoketoAccount, RoketoDao, RoketoStream } from "./interfaces/entities";
import { RoketoContractApi } from "./api";
import { ROKETO_CONTRACT_NAME } from "./constants";
export * from "./calculations";
export * from "./api";
export * from "./interfaces/entities";

export interface Roketo {
  api: RoketoContractApi;
  dao: RoketoDao;
  account: RoketoAccount;
}

export function getDefaultRoketoContractName() {
  return ROKETO_CONTRACT_NAME;
}

export async function initRoketo({
  account,
  roketoContractName = ROKETO_CONTRACT_NAME,
}: {
  account: Account;
  roketoContractName?: string;
}): Promise<Roketo> {
  const contract = new nearAPI.Contract(account, roketoContractName, {
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

  // create high level api for outside usage
  const api = new RoketoContractApi({
    contract,
    account,
  });

  const roketoUserAccountPromise = api.getAccount();

  const daoPromise = api.getDao();

  const [roketoUserAccount, dao] = await Promise.all([
    roketoUserAccountPromise,
    daoPromise,
  ]);

  return {
    api,
    dao,
    account: roketoUserAccount,
  };
}

export type StreamDirection = "in" | "out";

export function getStreamDirection(
  stream: RoketoStream,
  currentAccountId: string,
): StreamDirection | null {
  if (stream.receiver_id === currentAccountId) {
    return "in";
  }

  if (stream.owner_id === currentAccountId) {
    return "out";
  }

  // Stream doesn't belong to account
  return null;
}
