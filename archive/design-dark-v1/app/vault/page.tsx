'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Shield, Activity, ArrowRight, Zap, CheckCircle2, ChevronRight, Binary, Fingerprint, Terminal, Code2, Hexagon } from 'lucide-react';

export default function VaultFunnel() {
  const { ready, authenticated, login, logout } = usePrivy();

  const [hasVoted, setHasVoted] = useState(false);
  const [terminalMode, setTerminalMode] = useState(false);
  const [voteCasting, setVoteCasting] = useState(false);

  useEffect(() => {
    // Check local storage for prototype state
    const voted = localStorage.getItem('utp_waitlist_voted');
    if (voted === 'true') setHasVoted(true);
  }, []);

  const handleVote = () => {
    setVoteCasting(true);
    // Simulate transaction
    setTimeout(() => {
      setVoteCasting(false);
      setHasVoted(true);
      localStorage.setItem('utp_waitlist_voted', 'true');
    }, 1500);
  };

  // -------------------------------------------------------------
  // PHASE 1: Frictionless Entry (Unauthenticated)
  // -------------------------------------------------------------
  if (!ready) {
    return <div className="min-h-screen bg-[#06080B] flex items-center justify-center">
      <div className="animate-pulse w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500" />
    </div>;
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#06080B] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-md w-full bg-[#0a0d14]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl">
          <div className="flex justify-center mb-8">
            <Hexagon className="w-16 h-16 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Claim Your Citizenship</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Join the uBTC waitlist. We&apos;ll automatically provision a secure, non-custodial wallet for you using just your email.
          </p>
          
          <button 
            onClick={login}
            className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2 group"
          >
            Continue with Email
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-xs text-slate-500 mt-6 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Secured by Privy embedded wallets
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 2: Instant Citizenship (Waitlist Poll)
  // -------------------------------------------------------------
  if (!hasVoted) {
    return (
      <div className="min-h-screen bg-[#06080B] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl w-full">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              <span>Waitlist Action Required</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">You are almost in.</h1>
            <p className="text-xl text-slate-400">
              Cast your first <span className="text-white font-medium">Shadow Vote</span> to secure your spot and earn 10 UTP voting credits.
            </p>
          </div>

          <div className="bg-[#0a0d14] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
            <h2 className="text-2xl font-bold mb-2">Resolution #001</h2>
            <p className="text-slate-400 mb-8">Where should the first UTP public goods grant be allocated?</p>
            
            <div className="space-y-4">
              {['Open Source AI Safety', 'Clean Water Infrastructure', 'Decentralized Grid Systems'].map((choice, i) => (
                <button 
                  key={i}
                  onClick={() => handleVote()}
                  disabled={voteCasting}
                  className="w-full p-5 rounded-2xl border border-white/10 hover:border-green-500/50 hover:bg-white/5 transition-all flex items-center justify-between group text-left disabled:opacity-50"
                >
                  <span className="font-medium text-lg">{choice}</span>
                  {voteCasting ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-green-400 transition-colors" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 3: The Vault (Progressive Disclosure Dashboard)
  // -------------------------------------------------------------
  return (
    <div className={`min-h-screen transition-colors duration-500 ${terminalMode ? 'bg-[#000502] font-mono' : 'bg-[#06080B] font-sans'} text-white`}>
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hexagon className={`w-8 h-8 ${terminalMode ? 'text-green-500' : 'text-orange-500'}`} />
            <span className="text-xl font-bold tracking-wider">uBTC Vault</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium">10 UTP</span>
            </div>
            
            {/* The Magic Toggle */}
            <button 
              onClick={() => setTerminalMode(!terminalMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                terminalMode 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {terminalMode ? <Code2 className="w-4 h-4" /> : <Binary className="w-4 h-4" />}
              {terminalMode ? 'Terminal Mode: ON' : 'Under the Hood'}
            </button>

            <button onClick={logout} className="text-sm text-slate-400 hover:text-white">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {terminalMode ? (
          /* CYPHERPUNK / TERMINAL VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-green-500/30 bg-[#001005] p-6 rounded-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
                <h2 className="text-green-500 text-sm mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> sys.stdout // ZK-SNARK Proof Generation
                </h2>
                <div className="text-green-400/70 text-xs space-y-2 font-mono h-64 overflow-y-auto">
                  <p>{'>'} initializing quantum-resistant verifier...</p>
                  <p>{'>'} fetching lattice parameters [Dilithium2]...</p>
                  <p className="text-white">{'>'} multisig address: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</p>
                  <p>{'>'} awaiting unspent transaction outputs (UTXO)...</p>
                  <p className="animate-pulse">{'>'} standing by for deposit...</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-green-500/30 bg-[#001005] p-6 rounded-lg">
                  <h3 className="text-green-500 text-xs uppercase mb-2">Reserve Audit</h3>
                  <div className="text-2xl text-white">100.00%</div>
                  <div className="text-xs text-green-400/50 mt-1">Proof of Reserves: Verified</div>
                </div>
                <div className="border border-green-500/30 bg-[#001005] p-6 rounded-lg">
                  <h3 className="text-green-500 text-xs uppercase mb-2">Network Status</h3>
                  <div className="text-2xl text-white">Secure</div>
                  <div className="text-xs text-green-400/50 mt-1">L2 Synced • Block #184492</div>
                </div>
              </div>
            </div>

            <div className="border border-green-500/30 bg-[#001005] p-6 rounded-lg flex flex-col">
              <h2 className="text-green-500 text-sm mb-6 flex items-center gap-2">
                <Fingerprint className="w-4 h-4" /> deposit_payload.json
              </h2>
              <p className="text-xs text-green-400/70 mb-8 leading-relaxed">
                Send BTC to the quantum-resistant multisig. A ZK-proof will automatically mint equivalent uBTC to your connected Layer-2 wallet.
              </p>
              
              <div className="bg-black border border-green-500/20 p-4 rounded text-center break-all text-xs text-green-400 mb-8">
                bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
              </div>
              
              <button className="mt-auto w-full py-3 bg-green-500/10 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors text-sm">
                VERIFY TRANSACTION HASH
              </button>
            </div>
          </div>
        ) : (
          /* NEOBANK / CONSUMER VIEW */
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-10">
              <h1 className="text-4xl font-bold">Your Portfolio</h1>
              <div className="text-right">
                <div className="text-sm text-slate-400">Total Balance</div>
                <div className="text-3xl font-light">$0.00 <span className="text-lg text-slate-500">USD</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deposit Card */}
              <div className="bg-[#0a0d14] border border-white/10 rounded-3xl p-8 hover:border-orange-500/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
                  <ArrowRight className="w-6 h-6 text-orange-500 rotate-90" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Mint uBTC</h3>
                <p className="text-slate-400 mb-8">
                  Deposit Bitcoin to your secure 1:1 backed vault. Receive uBTC on Layer-2 instantly.
                </p>
                <button className="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-slate-200 transition-colors">
                  Deposit Bitcoin
                </button>
              </div>

              {/* Earn Card */}
              <div className="bg-[#0a0d14] border border-white/10 rounded-3xl p-8 hover:border-green-500/30 transition-colors flex flex-col">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                  <Activity className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Earn UTP Yield</h3>
                <p className="text-slate-400 mb-8">
                  You are a verified citizen. Participate in governance polls to multiply your UTP voting power.
                </p>
                <div className="mt-auto flex items-center gap-3 text-green-400 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Waitlist Active
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Shield className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                <div>
                  <div className="font-bold">Institutional Grade Security</div>
                  <div className="text-sm text-slate-400">100% physically backed. Cryptographically guaranteed.</div>
                </div>
              </div>
              <button onClick={() => setTerminalMode(true)} className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-white/10 rounded-full hover:bg-white/5 transition-colors">
                View Proof of Reserves
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
