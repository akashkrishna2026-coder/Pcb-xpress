import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword({ email });
      toast({ title: 'If an account exists, an email has been sent with a code.' });
      navigate('/reset-password');
    } catch (err) {
      toast({ title: 'Request failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password | PCB Xpress</title>
      </Helmet>
      <section className="py-20">
        <div className="container max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Reset your password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input name="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset code'}</Button>
                </div>
              </form>
              <p className="text-xs text-muted-foreground mt-4">You will receive a one-time code via email. The code expires in 15 minutes.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default ForgotPasswordPage;
