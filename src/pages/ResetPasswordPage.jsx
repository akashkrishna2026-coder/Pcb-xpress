import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const ResetPasswordPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', otp: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', otp: '', password: '', confirm: '', server: '' });

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '', server: '' }));
  };

  const validate = () => {
    const next = { email: '', otp: '', password: '', confirm: '', server: '' };
    let ok = true;
    if (!values.email || !/.+@.+\..+/.test(values.email)) {
      next.email = 'Please enter a valid email address';
      ok = false;
    }
    if (!values.otp || !/^\d{6}$/.test(values.otp)) {
      next.otp = 'Enter the 6-digit code from your email';
      ok = false;
    }
    if (!values.password || values.password.length < 6) {
      next.password = 'Password must be at least 6 characters';
      ok = false;
    }
    if (values.password !== values.confirm) {
      next.confirm = 'Passwords do not match';
      ok = false;
    }
    setErrors(next);
    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.resetPasswordWithOtp({ email: values.email, otp: values.otp, password: values.password });
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      navigate('/login');
    } catch (err) {
      const message = err?.message || 'Reset failed';
      setErrors((prev) => ({ ...prev, server: message }));
      toast({ title: 'Reset failed', description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password | PCB Xpress</title>
      </Helmet>
      <section className="py-20">
        <div className="container max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Enter code & new password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input name="email" type="email" placeholder="you@example.com" value={values.email} onChange={onChange} required />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Reset code</label>
                  <Input name="otp" placeholder="123456" value={values.otp} onChange={onChange} required />
                  {errors.otp && <p className="text-xs text-red-600 mt-1">{errors.otp}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">New password</label>
                  <Input name="password" type="password" placeholder="••••••••" value={values.password} onChange={onChange} required />
                  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Confirm password</label>
                  <Input name="confirm" type="password" placeholder="••••••••" value={values.confirm} onChange={onChange} required />
                  {errors.confirm && <p className="text-xs text-red-600 mt-1">{errors.confirm}</p>}
                </div>
                {errors.server && <p className="text-sm text-red-700">{errors.server}</p>}
                <div>
                  <Button type="submit" className="w-full" disabled={loading || !values.email || !values.otp || !values.password || !values.confirm}>{loading ? 'Resetting…' : 'Reset password'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default ResetPasswordPage;
