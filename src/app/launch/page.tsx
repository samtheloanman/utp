import React from 'react';
import { Shield, BrainCircuit, Vote, Globe2, Building2, ArrowRight, Zap, Hexagon } from 'lucide-react';
import Link from 'next/link';

export default function LaunchPage() {
  return (
    <div className="min-h-screen bg-[#06080B] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* Abstract Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/10 blur-[150px]"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-[#06080B]/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hexagon className="w-8 h-8 text-orange-500" strokeWidth={1.5} />
            <span className="text-xl font-bold tracking-wider">uBTC</span>
          </div>
          
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
            <Link href="#vision" className="hover:text-white transition-colors">Vision</Link>
            <Link href="#dao" className="hover:text-white transition-colors">AI DAO</Link>
            <Link href="#prediction" className="hover:text-white transition-colors">Prediction Markets</Link>
            <Link href="#utp" className="hover:text-green-400 transition-colors">UTP Token</Link>
          </div>

          <div className="flex gap-4">
            <button className="px-5 py-2.5 text-sm font-semibold rounded-full border border-white/10 hover:bg-white/5 transition-all">
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-cyan-400 mb-8 backdrop-blur-md">
          <Zap className="w-4 h-4" />
          <span>The World&apos;s Public BTC Vault</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter max-w-5xl leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
          Future-Proof Your Bitcoin. <br/>
          <span className="text-orange-500">Power The Future.</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mb-12 font-light leading-relaxed">
          Mint uBTC via quantum-resistant vaults. Deploy AI-first organizations. Vote on the future to earn UTP and build self-sustaining cities.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
          <button className="px-8 py-4 rounded-full bg-orange-500 text-black font-bold text-lg hover:bg-orange-400 transition-all hover:shadow-[0_0_40px_-10px_rgba(247,147,26,0.5)] flex items-center justify-center gap-2 group">
            Mint uBTC
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2 group hover:border-green-400/50">
            Earn UTP Credits
            <Vote className="w-5 h-5 text-green-400" />
          </button>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="max-w-7xl mx-auto px-6 py-24" id="dao">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          
          {/* Card 1: Vault */}
          <div className="md:col-span-2 rounded-3xl bg-white/5 border border-white/10 p-10 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/50 transition-colors">
            <div className="absolute right-[-10%] top-[-10%] w-[50%] h-[120%] bg-orange-500/10 blur-[100px] pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
            <div>
              <Shield className="w-12 h-12 text-orange-500 mb-6" strokeWidth={1.5} />
              <h3 className="text-3xl font-bold mb-4">Quantum-Resistant Vault</h3>
              <p className="text-slate-400 text-lg max-w-md">
                100% BTC-backed, embracing Bitcoin&apos;s volatility as the true store of value. Secured by quantum-proof cryptography.
              </p>
            </div>
          </div>

          {/* Card 2: AI Markets */}
          <div id="prediction" className="rounded-3xl bg-white/5 border border-white/10 p-10 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-400/50 transition-colors">
            <div className="absolute right-[-20%] bottom-[-20%] w-[100%] h-[100%] bg-cyan-400/10 blur-[80px] pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
            <div>
              <BrainCircuit className="w-12 h-12 text-cyan-400 mb-6" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold mb-4">AI Prediction Markets</h3>
              <p className="text-slate-400">
                Polymarket-style betting driven by AI-generated debates and automated fact-checking.
              </p>
            </div>
          </div>

          {/* Card 3: Vote & Earn */}
          <div className="rounded-3xl bg-white/5 border border-white/10 p-10 flex flex-col justify-between relative overflow-hidden group hover:border-green-400/50 transition-colors">
            <div className="absolute left-[-20%] top-[-20%] w-[100%] h-[100%] bg-green-400/10 blur-[80px] pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
            <div>
              <Vote className="w-12 h-12 text-green-400 mb-6" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold mb-4">Vote & Earn UTP</h3>
              <p className="text-slate-400">
                Prefer risk-free governance? Vote on proposals to earn UTP credits while shaping the network.
              </p>
            </div>
          </div>

          {/* Card 4: Launch Org */}
          <div className="md:col-span-2 rounded-3xl bg-white/5 border border-white/10 p-10 flex flex-col justify-between relative overflow-hidden group hover:border-white/30 transition-colors">
            <div className="absolute right-[10%] top-[10%] flex gap-4 opacity-10 md:opacity-20 pointer-events-none">
              <Hexagon className="w-32 h-32 text-white" strokeWidth={0.5} />
              <Hexagon className="w-32 h-32 text-white" strokeWidth={0.5} />
            </div>
            <div>
              <Building2 className="w-12 h-12 text-white mb-6" strokeWidth={1.5} />
              <h3 className="text-3xl font-bold mb-4">Launch Your AI Organization</h3>
              <p className="text-slate-400 text-lg max-w-md">
                Deploy your own sub-DAO with a custom token. Let autonomous AI agents manage your treasury and execute community will.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* The Grand Vision Section */}
      <section id="vision" className="relative py-32 px-6 overflow-hidden border-t border-white/5 bg-[#0a0d14]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-green-400/50 to-transparent"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-400/10 blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Globe2 className="w-16 h-16 text-green-400 mx-auto mb-8" strokeWidth={1} />
          <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-8">
            A Recursive Trust <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">For Humanity.</span>
          </h2>
          <p className="text-xl text-slate-400 font-light leading-relaxed mb-12">
            UTP isn&apos;t just a governance token. It powers a massive non-profit recursive trust dedicated to funding, designing, and building self-sustaining cities. By participating in the uBTC ecosystem, your yield and votes directly contribute to human expansion.
          </p>
          <button className="px-10 py-5 rounded-full bg-white text-black font-bold text-lg hover:bg-slate-200 transition-all hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
            Read The Manifesto
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#06080B] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <Hexagon className="w-6 h-6 text-orange-500" />
            <span className="font-bold text-white tracking-wider">uBTC DAO</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <p>© {new Date().getFullYear()} UTP Foundation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
