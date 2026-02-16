'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Class {
  id: string;
  name: string;
}

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100" />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100" />
);

export default function NewStudentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);

  const currentYear = new Date().getFullYear().toString();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    admissionNumber: '',
    academicYear: currentYear,
    classId: '',
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
    guardianEmail: '',
  });

  useEffect(() => {
    fetch('/api/admin/classes')
      .then(r => r.json())
      .then(d => setClasses(d.classes || []))
      .catch(() => setClasses([]));

    const year = currentYear.slice(-2);
    const random = Math.floor(1000 + Math.random() * 9000);
    setForm(prev => ({ ...prev, admissionNumber: `ADM${year}${random}` }));
  }, []);

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required';
    if (!form.lastName.trim()) return 'Last name is required';
    if (!form.gender) return 'Gender is required';
    if (!form.dateOfBirth) return 'Date of birth is required';
    if (!form.classId) return 'Class is required';
    if (!form.guardianName.trim()) return 'Guardian name is required';
    if (!form.guardianRelationship) return 'Guardian relationship is required';
    if (!form.guardianPhone.trim()) return 'Guardian phone is required';

    const dob = new Date(form.dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (dob > new Date()) return 'Date of birth cannot be in the future';
    if (age < 3 || age > 25) return 'Age must be between 3 and 25 years';

    const phone = form.guardianPhone.replace(/\s/g, '');
    if (!/^\+?2637\d{8}$|^07\d{8}$/.test(phone)) {
      return 'Phone must be +2637xxxxxxx or 07xxxxxxxx';
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
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          admissionNumber: form.admissionNumber,
          classId: form.classId,
          academicYear: form.academicYear,
          guardian: {
            name: form.guardianName.trim(),
            relationship: form.guardianRelationship,
            phone: form.guardianPhone.trim(),
            email: form.guardianEmail.trim() || undefined,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/dashboard/admin/students');
      } else {
        setError(data.error || 'Failed to create student');
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
          <Link href="/dashboard/admin/students" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">Add New Student</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          {/* Student Info */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Student Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" required>
                <Input type="text" value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} placeholder="Enter first name" />
              </Field>
              <Field label="Last Name" required>
                <Input type="text" value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} placeholder="Enter last name" />
              </Field>
              <Field label="Gender" required>
                <Select value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value}))}>
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </Select>
              </Field>
              <Field label="Date of Birth" required>
                <Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({...f, dateOfBirth: e.target.value}))} />
              </Field>
            </div>
          </section>

          {/* Enrollment */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Enrollment</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Admission Number">
                <Input type="text" value={form.admissionNumber} onChange={e => setForm(f => ({...f, admissionNumber: e.target.value}))} className="bg-gray-50" />
                <p className="mt-1 text-xs text-gray-500">Auto-generated</p>
              </Field>
              <Field label="Academic Year">
                <Input type="text" value={form.academicYear} readOnly className="bg-gray-50 text-gray-600" />
              </Field>
              <div className="col-span-2">
                <Field label="Class" required>
                  <Select value={form.classId} onChange={e => setForm(f => ({...f, classId: e.target.value}))}>
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          </section>

          {/* Guardian */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Guardian Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Guardian Name" required>
                <Input type="text" value={form.guardianName} onChange={e => setForm(f => ({...f, guardianName: e.target.value}))} placeholder="Enter guardian name" />
              </Field>
              <Field label="Relationship" required>
                <Select value={form.guardianRelationship} onChange={e => setForm(f => ({...f, guardianRelationship: e.target.value}))}>
                  <option value="">Select relationship</option>
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Guardian</option>
                </Select>
              </Field>
              <Field label="Phone Number" required>
                <Input type="tel" value={form.guardianPhone} onChange={e => setForm(f => ({...f, guardianPhone: e.target.value}))} placeholder="+2637xxxxxxx" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.guardianEmail} onChange={e => setForm(f => ({...f, guardianEmail: e.target.value}))} placeholder="Optional" />
              </Field>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Link href="/dashboard/admin/students" className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center font-medium">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Student'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
