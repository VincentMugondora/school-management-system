'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAcademicYear } from '@/app/actions/academic.actions';
import { ArrowLeft, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function NewAcademicYearPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [terms, setTerms] = useState([{ name: 'Term 1', startDate: '', endDate: '' }]);

  const addTerm = () => {
    setTerms([...terms, { name: `Term ${terms.length + 1}`, startDate: '', endDate: '' }]);
  };

  const removeTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  const updateTerm = (index: number, field: string, value: string) => {
    const newTerms = [...terms];
    newTerms[index] = { ...newTerms[index], [field]: value };
    setTerms(newTerms);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await createAcademicYear({
        name: formData.get('name') as string,
        startDate: new Date(formData.get('startDate') as string),
        endDate: new Date(formData.get('endDate') as string),
        isCurrent: formData.get('isCurrent') === 'on',
        terms: terms.map(t => ({
          name: t.name,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate)
        }))
      });

      if (result.success) {
        router.push('/admin/academics/years');
      } else {
        setError(result.error || 'Failed to create academic year');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/academics/years"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">New Academic Year</h1>
          <p className="text-gray-500 mt-1">Create a new academic year with terms</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Academic Year Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Academic Year Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g., 2024-2025"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isCurrent"
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Set as current academic year</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Terms</h2>
            <button
              type="button"
              onClick={addTerm}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Term
            </button>
          </div>

          <div className="space-y-4">
            {terms.map((term, index) => (
              <div key={index} className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700">Term {index + 1}</h4>
                  {terms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTerm(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={term.name}
                    onChange={(e) => updateTerm(index, 'name', e.target.value)}
                    placeholder="Term name"
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={term.startDate}
                    onChange={(e) => updateTerm(index, 'startDate', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={term.endDate}
                    onChange={(e) => updateTerm(index, 'endDate', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/academics/years"
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Academic Year'}
          </button>
        </div>
      </form>
    </div>
  );
}
