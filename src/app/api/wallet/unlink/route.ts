import { handleWalletProof } from '@/lib/wallet/proofRoute';
import { verifyWalletUnlink } from '@/lib/wallet/walletLink';

// Requires a fresh wallet proof for an address the caller has linked.
// Fresh-MFA for unlink is deferred to I2.
export async function POST(req: Request) {
  return handleWalletProof(req, verifyWalletUnlink);
}
