import {
  decodeFunctionData,
  createPublicClient,
  http,
  type Address,
  type Hex,
} from 'viem';
import {
  APP_CONFIG_ABI,
  GOVERNOR_STORAGE_ABI,
  KNOWN_APP_CONFIG_KEYS,
  resolveDaoChainConfig,
  type ResolvedDaoChainConfig,
} from '@/lib/contracts';
import {
  toProposalStateLabel,
  type DaoOverview,
  type DaoProposalSummary,
  type DecodedProposalAction,
} from './types';
import type { DaoReader } from './reader';

export const DEFAULT_CONFIRMATION_BLOCKS = 2;

export interface RpcReadClient {
  getBlockNumber(): Promise<bigint>;
  getChainId(): Promise<number>;
  readContract(params: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    blockNumber?: bigint;
  }): Promise<unknown>;
}

export interface GovernorStorageReaderOptions {
  config?: ResolvedDaoChainConfig;
  client?: RpcReadClient;
  confirmationBlocks?: number;
  rpcTimeoutMs?: number;
}

/**
 * Deterministically decodes proposal actions without trusting off-chain metadata.
 * Recognizes `AppConfig.setConfig(bytes32, string)` targeting the configured AppConfig contract;
 * all other targets or selectors return `"Unrecognized calldata"`.
 */
export function decodeProposalAction(params: {
  target: string;
  valueWei: string;
  calldata: string;
  appConfigAddress?: string | null;
}): DecodedProposalAction {
  const { target, valueWei, calldata, appConfigAddress } = params;

  if (
    appConfigAddress &&
    target.toLowerCase() !== appConfigAddress.toLowerCase()
  ) {
    return {
      target,
      valueWei,
      calldata,
      isRecognized: false,
      summary: 'Unrecognized calldata',
    };
  }

  try {
    const decoded = decodeFunctionData({
      abi: APP_CONFIG_ABI,
      data: calldata as Hex,
    });

    if (decoded.functionName === 'setConfig') {
      const [keyHex, rawValue] = decoded.args;
      const keyLabel =
        KNOWN_APP_CONFIG_KEYS[keyHex.toLowerCase()] ||
        `${keyHex.slice(0, 10)}…${keyHex.slice(-6)}`;
      const sanitizedValue = rawValue.replace(/[\r\n]+/g, ' ').slice(0, 120);
      return {
        target,
        valueWei,
        calldata,
        isRecognized: true,
        summary: `AppConfig.setConfig(${keyLabel}, "${sanitizedValue}")`,
        configKeyHex: keyHex,
        configKeyLabel: keyLabel,
        configValue: rawValue,
      };
    }
  } catch {
    // Non-matching selector or malformed ABI payload falls through cleanly
  }

  return {
    target,
    valueWei,
    calldata,
    isRecognized: false,
    summary: 'Unrecognized calldata',
  };
}

export function summarizeDecodedActions(actions: DecodedProposalAction[]): string {
  if (actions.length === 0) return 'Unrecognized calldata';
  if (actions.some((a) => !a.isRecognized)) return 'Unrecognized calldata';
  return actions.map((a) => a.summary).join(' · ');
}

/**
 * Reads on-chain DAO proposals strictly via OpenZeppelin `GovernorStorage` `eth_call` views.
 * Never invokes `eth_getLogs` (which Rootstock Testnet public RPCs reject with `-32601`).
 */
export class GovernorStorageRpcReader implements DaoReader {
  private readonly config: ResolvedDaoChainConfig;
  private readonly injectedClient?: RpcReadClient;
  private readonly confirmationBlocks: number;
  private readonly rpcTimeoutMs: number;

  constructor(options: GovernorStorageReaderOptions = {}) {
    this.config = options.config ?? resolveDaoChainConfig();
    this.injectedClient = options.client;
    this.confirmationBlocks = Math.max(
      0,
      options.confirmationBlocks ?? DEFAULT_CONFIRMATION_BLOCKS
    );
    this.rpcTimeoutMs = options.rpcTimeoutMs ?? 4_500;
  }

  private getClient(): RpcReadClient {
    if (this.injectedClient) return this.injectedClient;
    return createPublicClient({
      transport: http(this.config.rpcUrl, { timeout: this.rpcTimeoutMs }),
    }) as unknown as RpcReadClient;
  }

  async readOverview(): Promise<DaoOverview> {
    const fetchedAt = new Date().toISOString();
    const {
      networkLabel,
      networkKind,
      chainId,
      governorAddress,
      timelockAddress,
      tokenAddress,
      appConfigAddress,
    } = this.config;

    if (!governorAddress) {
      return {
        networkLabel,
        networkKind,
        chainId,
        isConfigured: false,
        status: 'unconfigured',
        errorMessage: null,
        governorAddress: null,
        timelockAddress,
        tokenAddress,
        appConfigAddress,
        latestBlock: null,
        confirmedBlock: null,
        confirmationBlocks: this.confirmationBlocks,
        proposals: [],
        fetchedAt,
      };
    }

    try {
      const client = this.getClient();
      const [rpcChainId, latestBlockBig] = await Promise.all([
        client.getChainId(),
        client.getBlockNumber(),
      ]);

      if (Number(rpcChainId) !== chainId) {
        throw new Error(
          `RPC chainId mismatch: expected ${chainId}, received ${rpcChainId}`
        );
      }

      const latestBlock = Number(latestBlockBig);
      const confirmedBlock = Math.max(0, latestBlock - this.confirmationBlocks);
      const confirmedBlockBig = BigInt(confirmedBlock);

      const latestCountBig = (await client.readContract({
        address: governorAddress,
        abi: GOVERNOR_STORAGE_ABI,
        functionName: 'proposalCount',
      })) as bigint;

      let confirmedCount = Number(latestCountBig);
      if (this.confirmationBlocks > 0 && latestBlock >= this.confirmationBlocks) {
        try {
          const confirmedCountBig = (await client.readContract({
            address: governorAddress,
            abi: GOVERNOR_STORAGE_ABI,
            functionName: 'proposalCount',
            blockNumber: confirmedBlockBig,
          })) as bigint;
          confirmedCount = Number(confirmedCountBig);
        } catch {
          // If an RPC prunes historical block tags, mark confirmation conservatively via block delta.
          confirmedCount = Number(latestCountBig);
        }
      } else if (latestBlock < this.confirmationBlocks) {
        confirmedCount = 0;
      }

      const totalCount = Number(latestCountBig);
      const proposals: DaoProposalSummary[] = [];

      for (let i = 0; i < totalCount; i += 1) {
        const indexBig = BigInt(i);
        const detailsTuple = (await client.readContract({
          address: governorAddress,
          abi: GOVERNOR_STORAGE_ABI,
          functionName: 'proposalDetailsAt',
          args: [indexBig],
        })) as readonly [
          bigint,
          readonly Address[],
          readonly bigint[],
          readonly Hex[],
          Hex,
        ];

        const [proposalIdBig, rawTargets, rawValues, rawCalldatas, descriptionHash] =
          detailsTuple;

        const [rawState, rawVotes, rawEta] = (await Promise.all([
          client.readContract({
            address: governorAddress,
            abi: GOVERNOR_STORAGE_ABI,
            functionName: 'state',
            args: [proposalIdBig],
          }),
          client.readContract({
            address: governorAddress,
            abi: GOVERNOR_STORAGE_ABI,
            functionName: 'proposalVotes',
            args: [proposalIdBig],
          }),
          client.readContract({
            address: governorAddress,
            abi: GOVERNOR_STORAGE_ABI,
            functionName: 'proposalEta',
            args: [proposalIdBig],
          }),
        ])) as [
          number | bigint,
          readonly [bigint, bigint, bigint],
          bigint,
        ];

        const targets = [...rawTargets];
        const values = rawValues.map((v) => v.toString());
        const calldatas = [...rawCalldatas];

        const actions = targets.map((target, actionIdx) =>
          decodeProposalAction({
            target,
            valueWei: values[actionIdx] ?? '0',
            calldata: calldatas[actionIdx] ?? '0x',
            appConfigAddress,
          })
        );

        const [againstVotes, forVotes, abstainVotes] = rawVotes;
        const { stateCode, state } = toProposalStateLabel(Number(rawState));
        const isConfirmed = i < confirmedCount;

        proposals.push({
          index: i,
          proposalId: proposalIdBig.toString(),
          proposerAddress: null,
          stateCode,
          state,
          targets,
          values,
          calldatas,
          description: null,
          descriptionHash,
          decodedSummary: summarizeDecodedActions(actions),
          actions,
          forVotesWei: forVotes.toString(),
          againstVotesWei: againstVotes.toString(),
          abstainVotesWei: abstainVotes.toString(),
          etaTimestamp: rawEta > BigInt(0) ? Number(rawEta) : null,
          isConfirmed,
          confirmationDepth: isConfirmed ? this.confirmationBlocks : 0,
        });
      }

      return {
        networkLabel,
        networkKind,
        chainId,
        isConfigured: true,
        status: 'live',
        errorMessage: null,
        governorAddress,
        timelockAddress,
        tokenAddress,
        appConfigAddress,
        latestBlock,
        confirmedBlock,
        confirmationBlocks: this.confirmationBlocks,
        proposals,
        fetchedAt,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'DAO RPC read failed';
      return {
        networkLabel,
        networkKind,
        chainId,
        isConfigured: true,
        status: 'unavailable',
        errorMessage: message,
        governorAddress,
        timelockAddress,
        tokenAddress,
        appConfigAddress,
        latestBlock: null,
        confirmedBlock: null,
        confirmationBlocks: this.confirmationBlocks,
        proposals: [],
        fetchedAt,
      };
    }
  }
}
