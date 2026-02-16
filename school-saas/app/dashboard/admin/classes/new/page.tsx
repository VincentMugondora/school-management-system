'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100";

export default function NewClassPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    grade: '',
    section: '',
    capacity: '40',
  });

  const validate = () => {
    if (!form.name.trim()) return 'Class name is required';
    if (!form.grade) return 'Grade/Level is required';
    if (parseInt(form.grade) < 1 || parseInt(form.grade) > 13) {
      return 'Grade must be between 1 and 13';
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          grade: parseInt(form.grade),
          section: form.section.trim() || null,
          capacity: parseInt(form.capacity) || 40,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/dashboard/admin/classes');
      } else {
        setError(data.error || 'Failed to create class');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/classes" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">Add New Class</h1>
        </div>
      </header>

      <main className="p-6 max-w-xl mx-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Grade 1 Red, Form 1A"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade/Level <span className="text-red-500">*</span>
              </label>
              <select
                value={form.grade}
                onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select grade</option>
                {[...Array(13)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Grade/Form {i + 1}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={form.section}
                onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                placeholder="e.g., A, B, Red"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capacity <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="number"
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              placeholder="40"
              min="1"
              max="100"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">Maximum number of students allowed (default: 40)</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Link
              href="/dashboard/admin/classes"
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                'Create Class'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
