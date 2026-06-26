import { useState, FormEvent, useEffect } from 'react';
import { validateEmail, validateGstin, validatePan } from '../../utils/validators';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, Eye, EyeOff, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { register } from '../../api/auth';
import { listPlans } from '../../api/plans';
import { createSubscription } from '../../api/subscriptions';
import { extractArray } from '../../api/helpers';
import { Plan } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import ThemedSelect from '../../components/ThemedSelect';

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
];
const CURRENCIES = ['INR', 'USD'];
const FINANCIAL_YEAR_START_MONTHS = ['January', 'March', 'April'];

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export default function RegisterPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    orgName: '', orgSlug: '', appSlug: 'books',
    gstin: '', pan: '', currency: 'INR',
    financialYearStart: 'April', timezone: 'Asia/Kolkata',
  });
  const [emailError, setEmailError] = useState('');
  const [gstinError, setGstinError] = useState('');
  const [panError, setPanError] = useState('');

  // Step 3 state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [plansLoading, setPlansLoading] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'orgName') updated.orgSlug = slugify(value);
      return updated;
    });
  };

  const step1Valid =
    formData.firstName.trim() && formData.lastName.trim() &&
    formData.email.trim() && !emailError && formData.password.trim();

  const step2Valid =
    formData.orgName.trim() && formData.gstin.trim() &&
    formData.pan.trim() && !gstinError && !panError;

  // Fetch plans when entering step 3
  useEffect(() => {
    if (step !== 3) return;
    setPlansLoading(true);
    listPlans('books')
      .then((res) => {
        const list = extractArray<Plan>(res).filter((p) => p.isActive !== false);
        setPlans(list);
        const free = list.find((p) => p.price === 0);
        if (free) setSelectedPlanId(free.id);
        else if (list.length > 0) setSelectedPlanId(list[0].id);
      })
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, [step]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const baseSlug = slugify(formData.orgName);
    try {
      // Register
      let registerResponse: any;
      let attempt = 0;
      while (true) {
        const orgSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
        try {
          registerResponse = await register({ ...formData, orgSlug });
          break;
        } catch (err: any) {
          const msg: string = err.response?.data?.message || err.message || '';
          if (msg.toLowerCase().includes('slug') && attempt < 10) { attempt++; }
          else throw err;
        }
      }

      const loginData = registerResponse?.data || registerResponse;
      const { accessToken: token, refreshToken, user: userData } = loginData;
      loginWithToken(token, refreshToken, userData);

      // Create subscription with selected plan
      const selectedPlan = plans.find((p) => p.id === selectedPlanId);
      if (selectedPlan) {
        try {
          const today = new Date().toISOString().split('T')[0];
          await createSubscription({
            orgId: userData.orgId,
            appId: selectedPlan.appId,
            planId: selectedPlan.id,
            startDate: today,
            status: 'active',
          });
        } catch {
          // Non-fatal
        }
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  const STEPS = ['Personal', 'Organization', 'Plan'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="text-center px-8 pt-8 pb-5">
            <h1 className="text-2xl font-semibold text-accent-500">Dream Platform</h1>
            <p className="mt-1 text-sm text-slate-500">Create your account</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center px-8 mb-6">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${step === i + 1 ? 'text-primary-600' : step > i + 1 ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-3" />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mx-8 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Step 1 — Personal */}
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); if (step1Valid) setStep(2); }} className="px-8 pb-8 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">Personal Details</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input type="text" required value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className={`${inputCls} pl-9`} placeholder="First" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Last name <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className={inputCls} placeholder="Last" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Email address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input type="email" required value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={(e) => setEmailError(validateEmail(e.target.value))}
                    className={`${inputCls} pl-9 ${emailError ? 'border-red-400' : ''}`}
                    placeholder="you@example.com" />
                </div>
                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
              </div>

              <div>
                <label className={labelCls}>Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} required value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`${inputCls} pl-9 pr-10`} placeholder="Choose a password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-primary-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={!step1Valid}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
                Next — Organization <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
              </p>
            </form>
          )}

          {/* Step 2 — Organization */}
          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); if (step2Valid) setStep(3); }} className="px-8 pb-8 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">Organization Details</p>

              <div>
                <label className={labelCls}>Organization name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input type="text" required value={formData.orgName}
                    onChange={(e) => handleChange('orgName', e.target.value)}
                    className={`${inputCls} pl-9`} placeholder="Your company name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>GSTIN <span className="text-red-500">*</span></label>
                  <input type="text" required maxLength={15} value={formData.gstin}
                    onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                    onBlur={(e) => setGstinError(validateGstin(e.target.value))}
                    className={`${inputCls} ${gstinError ? 'border-red-400' : ''}`}
                    placeholder="22AAAAA0000A1Z5" />
                  <div className="flex justify-between mt-1">
                    {gstinError ? <p className="text-xs text-red-500">{gstinError}</p> : <span />}
                    <p className="text-xs text-slate-400">{formData.gstin.length}/15</p>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>PAN <span className="text-red-500">*</span></label>
                  <input type="text" required maxLength={10} value={formData.pan}
                    onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                    onBlur={(e) => setPanError(validatePan(e.target.value))}
                    className={`${inputCls} ${panError ? 'border-red-400' : ''}`}
                    placeholder="AAAAA0000A" />
                  <div className="flex justify-between mt-1">
                    {panError ? <p className="text-xs text-red-500">{panError}</p> : <span />}
                    <p className="text-xs text-slate-400">{formData.pan.length}/10</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Currency <span className="text-red-500">*</span></label>
                  <ThemedSelect value={formData.currency} onChange={(v) => handleChange('currency', v)}
                    options={CURRENCIES.map((o) => ({ value: o, label: o }))} />
                </div>
                <div>
                  <label className={labelCls}>Financial Year Start <span className="text-red-500">*</span></label>
                  <ThemedSelect value={formData.financialYearStart} onChange={(v) => handleChange('financialYearStart', v)}
                    options={FINANCIAL_YEAR_START_MONTHS.map((o) => ({ value: o, label: o }))} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Timezone <span className="text-red-500">*</span></label>
                <ThemedSelect value={formData.timezone} onChange={(v) => handleChange('timezone', v)}
                  options={TIMEZONES.map((o) => ({ value: o, label: o }))} />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep(1); setError(''); }}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={!step2Valid}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
                  Next — Choose Plan <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — Plan Selection */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">Choose a Plan</p>

              {plansLoading ? (
                <div className="py-8 flex justify-center">
                  <svg className="animate-spin h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : plans.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No plans available. You can set up a subscription later.</p>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => {
                    const selected = selectedPlanId === plan.id;
                    return (
                      <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)}
                        className={`w-full text-left rounded-xl border-2 p-4 transition-all ${selected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">{plan.name}</p>
                              {plan.price === 0 && (
                                <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Free</span>
                              )}
                            </div>
                            {plan.description && <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>}
                            {plan.price > 0 && (
                              <p className="text-sm font-bold text-slate-700 mt-1">
                                {plan.currency} {plan.price}<span className="text-xs font-normal text-slate-400">/{plan.interval}</span>
                              </p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'}`}>
                            {selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        {plan.features?.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {plan.features.slice(0, 3).map((f, i) => (
                              <li key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Check className="w-3 h-3 text-green-500 flex-shrink-0" />{f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(2); setError(''); }}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={loading || (!selectedPlanId && plans.length > 0)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : 'Create Account'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
