import { useState, FormEvent } from 'react';
import { validateEmail } from '../../utils/validators';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Building2, Eye, EyeOff } from 'lucide-react';
import { register } from '../../api/auth';
import ThemedSelect from '../../components/ThemedSelect';

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  "America/Phoenix"
];
const CURRENCIES = ['INR', 'USD'];
const FINANCIAL_YEAR_START_MONTHS = [
  'January',
  'March',
  'April'
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    orgName: '',
    orgSlug: '',
    appSlug: 'books',
    gstin: '',
    pan: '',
    currency: 'INR',
    financialYearStart: 'April',
    timezone: 'Asia/Kolkata',
  });
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'orgName') {
        updated.orgSlug = slugify(value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const baseSlug = slugify(formData.orgName);
    try {
      let attempt = 0;
      while (true) {
        const orgSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
        try {
          await register({ ...formData, orgSlug });
          break;
        } catch (err: any) {
          const msg: string = err.response?.data?.message || err.message || '';
          if (msg.toLowerCase().includes('slug') && attempt < 10) {
            attempt++;
          } else {
            throw err;
          }
        }
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-accent-500">Dream Platform</h1>
            <p className="mt-2 text-sm text-slate-600">Create your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">
                Account created successfully!
              </div>
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                      First name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={(e) => setEmailError(validateEmail(e.target.value))}
                      className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${emailError ? "border-red-400" : "border-slate-300"}`}
                    />
                  </div>
                  {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-primary-600 transition-colors duration-200"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-slate-700 mb-1">
                    Organization name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="orgName"
                      type="text"
                      required
                      value={formData.orgName}
                      onChange={(e) => handleChange('orgName', e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                  <div>
                    <label htmlFor="gstin" className="block text-sm font-medium text-slate-700 mb-1">
                      GSTIN
                    </label>
                    <input
                      id="gstin"
                      type="text"
                      required
                      value={formData.gstin}
                      onChange={(e) => handleChange('gstin', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="pan" className="block text-sm font-medium text-slate-700 mb-1">
                      PAN
                    </label>
                    <input
                      id="pan"
                      type="text"
                      required
                      value={formData.pan}
                      onChange={(e) => handleChange('pan', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency
                  </label>
                  <ThemedSelect
                    value={formData.currency}
                    onChange={(v) => handleChange('currency', v)}
                    options={CURRENCIES.map((o) => ({ value: o, label: o }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Financial Year Start
                  </label>
                  <ThemedSelect
                    value={formData.financialYearStart}
                    onChange={(v) => handleChange('financialYearStart', v)}
                    options={FINANCIAL_YEAR_START_MONTHS.map((o) => ({ value: o, label: o }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Timezone
                  </label>
                  <ThemedSelect
                    value={formData.timezone}
                    onChange={(v) => handleChange('timezone', v)}
                    options={TIMEZONES.map((o) => ({ value: o, label: o }))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="col-span-full w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
