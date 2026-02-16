import { Users, Mail, Phone, User, Shield } from 'lucide-react';

interface Guardian {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  phone?: string | null;
  relationship?: string;
  isPrimaryContact?: boolean;
}

interface GuardiansTabProps {
  guardians: Guardian[];
}

export function GuardiansTab({ guardians }: GuardiansTabProps) {
  if (guardians.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No Guardians</h3>
        <p className="text-gray-500 mt-1">No parent or guardian information is associated with this student.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Parent / Guardian Information</h3>
          <p className="text-sm text-gray-500 mt-1">Contact details for student&apos;s guardians</p>
        </div>
        <div className="divide-y divide-gray-100">
          {guardians.map((guardian) => (
            <div key={guardian.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-purple-600">
                    {guardian.user.firstName[0]}
                    {guardian.user.lastName[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {guardian.user.firstName} {guardian.user.lastName}
                      </h4>
                      {guardian.relationship && (
                        <p className="text-sm text-gray-500">{guardian.relationship}</p>
                      )}
                      {guardian.isPrimaryContact && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                          <Shield className="w-3 h-3" />
                          Primary Contact
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-800">{guardian.user.email}</p>
                      </div>
                    </div>
                    {guardian.phone && (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="text-sm font-medium text-gray-800">{guardian.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Guardians</p>
              <p className="text-xl font-bold text-gray-800">{guardians.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Primary Contacts</p>
              <p className="text-xl font-bold text-gray-800">
                {guardians.filter((g) => g.isPrimaryContact).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">With Phone</p>
              <p className="text-xl font-bold text-gray-800">
                {guardians.filter((g) => g.phone).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
