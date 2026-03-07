import React from 'react';
import ShadowVote from '@/components/ShadowVote';

export default async function BillPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // In a real app, we would fetch the bill details here
  const bill = {
    id,
    bill_number: 'H.R. 1234',
    title: 'Sample Bill for Shadow Voting Implementation',
    summary: 'This bill is a demonstration of the shadow voting interface implemented as part of M4.',
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 dark:bg-black">
      <div className="mx-auto max-w-3xl px-6">
        <header className="mb-8">
          <div className="mb-2 text-sm font-medium text-blue-600 dark:text-blue-400">
            {bill.bill_number}
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {bill.title}
          </h1>
        </header>

        <section className="mb-12 rounded-xl bg-white p-8 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Summary</h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            {bill.summary}
          </p>
        </section>

        <section>
          <ShadowVote billId={id} />
        </section>
      </div>
    </div>
  );
}
