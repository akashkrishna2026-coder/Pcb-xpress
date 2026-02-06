import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { setSalesUser, setSalesToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, Lock } from 'lucide-react';

const SalesLoginPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const isEmailValid = (email) => /.+@.+\..+/.test(email);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmailValid(values.email)) {
      toast({ title: 'Invalid email', description: 'Enter a valid sales email.' });
      return;
    }
    if (values.password.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters.' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.salesLogin({ email: values.email, password: values.password });
      
      if (res?.token && res?.salesUser) {
        setSalesUser(res.salesUser);
        setSalesToken(res.token);
        toast({ title: 'Sales login successful' });
        navigate('/sales/dashboard');
      } else {
        throw new Error('Unexpected response');
      }
    } catch (error) {
      toast({ 
        title: 'Login failed', 
        description: error.message || 'Invalid credentials. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sales Login | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Sales login for PCB Xpress panel." />
      </Helmet>
      <section className="min-h-screen py-16 md:py-20 relative flex items-center justify-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-orange-500/10 via-transparent to-emerald-200/30" />
        <div className="container max-w-md w-full mx-auto">
          <Card className="backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardHeader>
              <div className="flex items-center gap-2 text-orange-600">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs tracking-wide uppercase">Sales Portal</span>
              </div>
              <CardTitle>PCB Xpress Sales</CardTitle>
              <p className="text-sm text-muted-foreground">Sales team access only.</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium">Sales email</label>
                  <Input 
                    name="email" 
                    type="email" 
                    placeholder="sales@pcbxpress.in" 
                    value={values.email} 
                    onChange={onChange} 
                    required 
                  />
                </div>
                <div className="relative">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={values.password}
                    onChange={onChange}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-primary"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-2" /> : <Eye className="w-5 h-2" />}
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
              <div className="text-xs text-muted-foreground mt-4 flex justify-between items-center">
                <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> For sales team only</span>
                <Link to="/" className="hover:text-primary">Back to site</Link>
              </div>
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  New sales team member? <Link to="/sales/signup" className="text-primary hover:underline">Sign up here</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default SalesLoginPage;
