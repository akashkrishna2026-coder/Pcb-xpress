import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { setUser, setToken, getQuotes, clearQuotes, setAdmin, setAdminToken } from '@/lib/storage';
import { api } from '@/lib/api';

const LoginPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    gstNo: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isEmailValid = (email) => /.+@.+\..+/.test(email);
  const isGstNoValid = (gstNo) => !gstNo || /^[A-Za-z0-9]{1,15}$/.test(gstNo);
  const isPhoneValid = (phone) => phone && /^[0-9]{10}$/.test(phone);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validations first
    if (!values.email) {
      toast({ title: 'Email required', description: 'Please enter your email address.' });
      return;
    }
    if (!values.password) {
      toast({ title: 'Password required', description: 'Please enter your password.' });
      return;
    }
    
    // Signup specific validations
    if (mode === 'signup') {
      if (!values.name.trim()) {
        toast({ title: 'Name required', description: 'Please enter your full name.' });
        return;
      }
      if (values.password !== values.confirm) {
        toast({ title: 'Passwords do not match', description: 'Please confirm your password.' });
        return;
      }
      if (!values.phone) {
        toast({ title: 'Phone required', description: 'Please enter your phone number.' });
        return;
      }
      if (!isPhoneValid(values.phone)) {
        toast({ title: 'Invalid phone number', description: 'Phone number must be exactly 10 digits.' });
        return;
      }
      if (values.gstNo && !isGstNoValid(values.gstNo)) {
        toast({ title: 'Invalid GST number', description: 'GST number must be max 15 characters with letters and numbers only.' });
        return;
      }
    }
    
    // Format validations
    if (!isEmailValid(values.email)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.' });
      return;
    }
    if (values.password.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters.' });
      return;
    }
    setLoading(true);
    try {
      let data;
      if (mode === 'login') {
        data = await api.login({ email: values.email, password: values.password });
      } else {
        data = await api.signup({ 
          name: values.name, 
          email: values.email, 
          password: values.password,
          gstNo: values.gstNo,
          phone: values.phone
        });
      }
      
      if (data?.token && data?.user) {
        setToken(data.token);
        setUser(data.user);

        // Handle admin role - also set admin credentials for admin users
        if (data.user.role === 'admin') {
          setAdmin(data.user);
          setAdminToken(data.token);
        }

        // Sync anonymous quotes to server
        const localQuotes = getQuotes();
        if (localQuotes.length > 0) {
          try {
              let syncedCount = 0;
              for (const quote of localQuotes) {
                if (!quote.id) continue;
                if (isNaN(quote.id)) {
                  // Has backend ID, update to associate with user
                  try {
                    await api.updateQuoteUser(quote.id, data.token);
                    syncedCount++;
                  } catch {
                    // Skip if not authorized
                  }
                } else {
                  // Local timestamp ID, create new (fallback)
                  const quoteData = { ...quote };
                  delete quoteData.id;
                  await api.createQuote(quoteData, data.token);
                  syncedCount++;
                }
              }
              if (syncedCount > 0) {
                clearQuotes();
                toast({ title: `${syncedCount} quote${syncedCount > 1 ? 's' : ''} synced to your account` });
              }
            } catch (syncErr) {
              console.error('Quote sync failed:', syncErr);
              toast({ title: 'Login successful', description: 'Some quotes may not have synced. Please try again later.' });
            }
          }

        toast({ title: mode === 'login' ? 'Welcome back!' : 'Account created' });
        const from = location?.state?.from;
        
        // Redirect admin users to admin dashboard
        if (data.user.role === 'admin') {
          navigate(from && typeof from === 'string' ? from : '/pcbXpress', { replace: true });
        } else {
          navigate(from && typeof from === 'string' ? from : '/dashboard', { replace: true });
        }
      } else {
        throw new Error('Unexpected response');
      }
    } catch (err) {
      toast({ title: 'Authentication failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  return (
    <>
      <Helmet>
        <title>{mode === 'login' ? 'Login' : 'Create Account'} | PCB Xpress</title>
        <meta name="description" content="Login or create an account to manage your quotes and orders." />
      </Helmet>
      <section className="py-20">
        <div className="container max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>{mode === 'login' ? 'Welcome back' : 'Create your account'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Button variant={mode === 'login' ? 'default' : 'outline'} onClick={() => setMode('login')}>Login</Button>
                <Button variant={mode === 'signup' ? 'default' : 'outline'} onClick={() => setMode('signup')}>Sign Up</Button>
              </div>
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Sales team members? <a href="/sales/login" className="text-primary hover:underline">Login here</a>
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === 'signup' && (
                  <div>
                    <label className="text-sm font-medium">Full name</label>
                    <Input name="name" placeholder="Your name" value={values.name} onChange={onChange} />
                  </div>
                )}
                {mode === 'signup' && (
                  <div>
                    <label className="text-sm font-medium">GST Number (Optional)</label>
                    <Input 
                      name="gstNo" 
                      placeholder="GSTIN1234567890" 
                      value={values.gstNo} 
                      onChange={onChange} 
                      maxLength={15}
                      pattern="[A-Za-z0-9]{1,15}"
                    />
                  </div>
                )}
                {mode === 'signup' && (
                  <div>
                    <label className="text-sm font-medium">Phone Number *</label>
                    <Input 
                      name="phone" 
                      placeholder="9876543210" 
                      value={values.phone} 
                      onChange={onChange} 
                      maxLength={10}
                      pattern="[0-9]{10}"
                      title="Phone number must be exactly 10 digits"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input name="email" type="email" placeholder="you@example.com" value={values.email} onChange={onChange} required />
                </div>
                <div>
  <label className="text-sm font-medium">Password</label>
    <div className="relative">
     <Input
      name="password"
      type={showPassword ? "text" : "password"}
      placeholder="••••••••"
      value={values.password}
      onChange={onChange}
      required
      className="pr-10"
      />

    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="absolute inset-y-0 right-2 flex items-center translate-y-[2px] p-1 text-muted-foreground hover:text-primary"
      aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mode === 'signup' && (
        <div>
       <label className="text-sm font-medium">Confirm password</label>

       <div className="relative">
      <Input
        name="confirm"
        type={showConfirm ? "text" : "password"}
        placeholder="••••••••"
        value={values.confirm}
        onChange={onChange}
        required
        className="pr-10"
      />

      <button
        type="button"
        onClick={() => setShowConfirm((v) => !v)}
        className="absolute inset-y-0 right-2 flex items-center translate-y-[2px] p-1 text-muted-foreground hover:text-primary"
        aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
      >
        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  </div>
)}
                {mode === 'login' && (
                  <div className="text-right">
                    <button type="button" className="text-sm text-muted-foreground hover:text-primary" onClick={() => navigate('/forgot-password')}>Forgot password?</button>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-4">By continuing, you agree to our Terms and acknowledge our Privacy Policy.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default LoginPage;
