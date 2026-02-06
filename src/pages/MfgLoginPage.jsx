import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { setMfgUser, setMfgToken } from '@/lib/storage';
import { Factory, BadgeCheck, KeyRound, Eye, EyeOff } from 'lucide-react';

const MfgLoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const identifier = values.identifier.trim();
    const password = values.password.trim();
    if (identifier.length < 3) {
      toast({ title: 'Login ID required', description: 'station ID or email.' });
      return;
    }
    if (password.length < 4) {
      toast({ title: 'Password required', description: 'Enter your operator password.' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.mfgLogin({ identifier, password });
      if (res?.token && res?.operator) {
        setMfgToken(res.token);
        setMfgUser(res.operator);
        toast({ title: 'Operator authenticated', description: `Welcome ${res.operator.name || res.operator.loginId || ''}` });
        navigate('/mfgpcbxpress');
        return;
      }
      throw new Error('Unexpected response from server');
    } catch (err) {
      toast({
        title: 'Login failed',
        description: err?.message || 'Unable to sign in with the provided credentials.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Manufacturing Login | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta
          name="description"
          content="Operator and station login portal for PCB Xpress manufacturing dashboards."
        />
      </Helmet>
      <section className="min-h-screen py-16 md:py-20 relative flex items-center justify-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-slate-900/40 via-slate-800/20 to-emerald-500/20" />
        <div className="container max-w-md w-full mx-auto">
          <Card className="backdrop-blur supports-[backdrop-filter]:bg-background/80 border-emerald-400/40">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-500">
                <Factory className="h-5 w-5" />
                <span className="text-xs tracking-wide uppercase">Manufacturing access</span>
              </div>
              <CardTitle className="text-2xl font-semibold">MFG Portal Login</CardTitle>
              <p className="text-sm text-muted-foreground">
                Scan your traveler badge or enter the station ID to continue.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    Station / Operator ID
                  </label>
                  <Input
                    name="identifier"
                    placeholder="e.g. cnc-drill-01"
                    value={values.identifier}
                    onChange={onChange}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    Password / PIN
                  </label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      value={values.password}
                      onChange={onChange}
                      autoComplete="current-password"
                      required
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-emerald-500" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying…' : 'Sign In'}
                </Button>
              </form>
              <div className="text-xs text-muted-foreground mt-4 flex justify-between items-center">
                <span className="flex items-center gap-1">Supervisors: contact QA to reset credentials.</span>
                <Link to="/" className="hover:text-emerald-500">Back</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default MfgLoginPage;
