'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Loader2, Download } from 'lucide-react';

export default function ImportStudentsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      // Parse CSV for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').slice(0, 6).map(row => row.split(','));
        setPreview(rows);
      };
      reader.readAsText(selectedFile);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setLoading(true);
    setError(null);

    // TODO: Implement actual import API call
    // For now, simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    router.push('/dashboard/admin/students');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-8 py-4 flex items-center gap-4 border-b border-gray-100">
        <Link 
          href="/dashboard/admin/students" 
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Import Students</h1>
      </header>

      {/* Content */}
      <main className="p-8 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Instructions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Import Instructions</h2>
            <p className="text-gray-500 text-sm mb-4">
              Upload a CSV file with student data. The file should include the following columns:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <code className="block mb-2">firstName, lastName, email, phone, admissionNumber, gender, dateOfBirth</code>
              <p className="text-xs text-gray-500">
                * firstName and lastName are required
              </p>
            </div>
            <button 
              className="mt-4 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-2"
              onClick={() => {
                // Download template CSV
                const template = 'firstName,lastName,email,phone,admissionNumber,gender,dateOfBirth\nJohn,Doe,john@example.com,1234567890,ADM001,MALE,2010-01-15\nJane,Smith,jane@example.com,0987654321,ADM002,FEMALE,2010-03-20';
                const blob = new Blob([template], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'students_template.csv';
                a.click();
              }}
            >
              <Download className="w-4 h-4" />
              Download Template CSV
            </button>
          </div>

          {/* File Upload */}
          <form onSubmit={handleSubmit}>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-300 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop your CSV file here, or</p>
              <label className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
                Browse Files
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {file && (
                <p className="mt-4 text-sm text-gray-600">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>

            {/* Preview */}
            {preview && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Preview (first 5 rows)</h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview[0]?.map((header, i) => (
                          <th key={i} className="px-4 py-2 text-left font-medium text-gray-600">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-2 text-gray-600">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-8">
              <Link
                href="/dashboard/admin/students"
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-center font-medium"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !file}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Students'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
