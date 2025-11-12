import PlaybookReference from '@/components/PlaybookReference';

export default function ReferencePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Validation Playbook</h1>
          <p className="text-gray-600">Quick reference for the Four-Step Validation Method</p>
        </div>
        <PlaybookReference />
      </div>
    </main>
  );
}

