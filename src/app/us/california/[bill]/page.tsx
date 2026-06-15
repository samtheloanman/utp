import { promises as fs } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const dataDir = path.join(process.cwd(), 'src', 'data', 'legiscan');
  try {
    const files = await fs.readdir(dataDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        bill: file.replace('.json', ''),
      }));
  } catch (error) {
    return [];
  }
}

export default async function BillPage({ params }: { params: Promise<{ bill: string }> }) {
  const resolvedParams = await params;
  const dataDir = path.join(process.cwd(), 'src', 'data', 'legiscan');
  const filePath = path.join(dataDir, `${resolvedParams.bill}.json`);
  
  let billData;
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    billData = JSON.parse(fileContent);
  } catch (error) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-blue-600 px-6 py-8 sm:p-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-800">
              California State Legislature
            </span>
            <span className="text-blue-100 text-sm font-semibold">
              ID: {billData.bill_id}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {billData.bill_number}
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            {billData.title}
          </p>
        </div>
        
        <div className="px-6 py-8 sm:p-10">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
              AI Summary
            </h2>
            <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
              {billData.summary}
            </p>
          </div>

          {billData.faqs && billData.faqs.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                Frequently Asked Questions
              </h2>
              <dl className="space-y-6">
                {billData.faqs.map((faq: any, index: number) => (
                  <div key={index} className="bg-white">
                    <dt className="text-base font-medium text-slate-900">
                      {faq.question}
                    </dt>
                    <dd className="mt-2 text-sm text-slate-600">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
