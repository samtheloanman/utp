export type VoteChoice = 'for' | 'against' | 'unsure';

export type ParsedVoteInput =
  | { ok: true; billId: string; vote: VoteChoice }
  | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VOTES: readonly VoteChoice[] = ['for', 'against', 'unsure'];

/**
 * Validate a vote request body. Only `billId` and `vote` are read; any
 * client-supplied user id is ignored (identity comes from the session).
 */
export function parseVoteInput(body: unknown): ParsedVoteInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object' };
  }
  const { billId, vote } = body as Record<string, unknown>;
  if (typeof billId !== 'string' || !UUID_RE.test(billId)) {
    return { ok: false, message: 'billId must be a UUID' };
  }
  if (typeof vote !== 'string' || !VOTES.includes(vote as VoteChoice)) {
    return { ok: false, message: "vote must be 'for', 'against' or 'unsure'" };
  }
  return { ok: true, billId, vote: vote as VoteChoice };
}
