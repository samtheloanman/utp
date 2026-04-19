"use client";

import { AppConfig, UserSession, showConnect } from "@stacks/connect";
import { useEffect, useState } from "react";
import Image from "next/image";

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

export default function Home() {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleConnect = () => {
    showConnect({
      appDetails: {
        name: "UtP Freedom Stack",
        icon: window.location.origin + "/favicon.ico",
      },
      redirectTo: "/",
      onFinish: () => {
        window.location.reload();
      },
      userSession,
    });
  };

  const handleDisconnect = () => {
    userSession.signUserOut();
    setUserData(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-zinc-950 text-zinc-50 font-sans">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-zinc-800 bg-gradient-to-b from-zinc-900 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-zinc-800 lg:p-4">
          Status: <span className="ml-2 font-bold text-green-400">MVP (Alpha)</span>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-zinc-900 via-zinc-900 lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://stacks.co"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by{" "}
            <Image
              src="/vercel.svg" // Placeholder for Stacks logo
              alt="Stacks Logo"
              className="dark:invert"
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div>

      <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-to-br before:from-transparent before:to-blue-500 before:opacity-10 before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-to-t after:from-sky-900 after:via-sky-900 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px] z-[-1]">
        <h1 className="text-6xl font-bold tracking-tighter sm:text-7xl">
          The Freedom Stack
        </h1>
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:grid-cols-3 lg:text-left gap-8">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Truth Engine{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Censorship-resistant news aggregation verified by AI (Llama 3).
          </p>
          <div className="mt-4 p-2 bg-zinc-900 rounded border border-zinc-800 text-xs text-zinc-400">
            Connecting to decentralized nodes...
          </div>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Sovereign Voice{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Immutable voting on critical issues anchored to Bitcoin L2.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {!userData ? (
              <button
                onClick={handleConnect}
                className="rounded bg-white px-4 py-2 text-sm font-bold text-black hover:bg-zinc-200"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="text-sm text-green-400">
                Connected: {userData.profile.stxAddress.mainnet.slice(0, 6)}...
                <button
                  onClick={handleDisconnect}
                  className="ml-2 text-xs text-zinc-500 underline hover:text-red-400"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            UtP Stable{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            10,000 Sats = 1 UtP Token. Sound money backed by Bitcoin.
          </p>
          <div className="mt-4 p-2 bg-zinc-900 rounded border border-zinc-800 text-xs text-zinc-400">
            Contract Status: <span className="text-yellow-500">Pending Deployment</span>
          </div>
        </div>
      </div>
    </main>
  );
}
