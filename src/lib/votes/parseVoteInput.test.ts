import { describe, it, expect } from 'vitest';
import { parseVoteInput } from './parseVoteInput';

const BILL = '3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f';

describe('parseVoteInput', () => {
  it('rejects non-object bodies', () => {
    for (const b of [null, undefined, 'x', 42, [BILL, 'for']]) {
      expect(parseVoteInput(b).ok).toBe(false);
    }
  });
  it('rejects non-UUID billId', () => {
    expect(parseVoteInput({ billId: 'abc', vote: 'for' }).ok).toBe(false);
    expect(parseVoteInput({ billId: 123, vote: 'for' }).ok).toBe(false);
  });
  it("rejects vote 'maybe'", () => {
    expect(parseVoteInput({ billId: BILL, vote: 'maybe' }).ok).toBe(false);
  });
  it('accepts valid input and ignores user_id/userId', () => {
    const r = parseVoteInput({ billId: BILL, vote: 'against', user_id: 'x', userId: 'y' });
    expect(r).toEqual({ ok: true, billId: BILL, vote: 'against' });
  });
});
