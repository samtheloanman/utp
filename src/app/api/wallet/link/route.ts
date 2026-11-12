import { handleWalletProof } from '@/lib/wallet/proofRoute';
import { verifyWalletLink } from '@/lib/wallet/walletLink';

export async function POST(req: Request) {
  return handleWalletProof(req, verifyWalletLink, 'address_taken');
}
