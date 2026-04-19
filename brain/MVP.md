# UtP Freedom Stack MVP

## Current Status
- **Phase**: Pre-MVP
- **Stack**: Next.js 14, Supabase, Stacks (Bitcoin L2), Ollama (AI)
- **Goal**: Local environment setup for rapid iteration.

## MVP Requirements
1.  **Smart Contracts**: `utp-stable` (10k sats) and `utp-vote`.
2.  **Frontend**: Connect Wallet (Hiro/Xverse) + Vote UI.
3.  **Backend**: Supabase `news_items` table + AI ingestion script.

## Setup Instructions (Local)
1.  **Install Stacks Tools**: `brew install clarinet` (if available) or `npm i -g @hirosystems/clarinet`.
2.  **Start Dev Server**: `npm run dev`.
3.  **Deploy Contracts**: `clarinet integrate`.
4.  **Connect Wallet**: Install Hiro Wallet extension.

## Active Tasks
- [ ] Install Clarinet
- [ ] Initialize Stacks project
- [ ] Write `utp-stable.clar`
- [ ] Write `utp-vote.clar`
- [ ] Connect frontend to Stacks.js
