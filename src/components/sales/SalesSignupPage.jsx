import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Lock, Building, Phone, Mail } from 'lucide-react';

const SalesSignupPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    department: '',
    experience: '',
    address: '',
    notes: ''
  });

  const isEmailValid = (email) => /.+@.+\..+/.test(email);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!values.name || !values.email || !values.password || !values.phone) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields' });
      return;
    }

    if (!isEmailValid(values.email)) {
      toast({ title: 'Invalid email', description: 'Enter a valid email address' });
      return;
    }

    if (values.password.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters' });
      return;
    }

    if (values.password !== values.confirmPassword) {
      toast({ title: 'Password mismatch', description: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      // Simulate API call - replace with actual API endpoint
      const res = await api.salesSignup({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone,
        department: values.department,
        experience: values.experience,
        address: values.address,
        notes: values.notes
      });

      if (res?.message) {
        toast({ 
          title: 'Registration successful!', 
          description: 'Your account has been created. Please wait for admin approval.' 
        });
        navigate('/sales/login');
      } else {
        throw new Error('Unexpected response');
      }
    } catch (error) {
      toast({ 
        title: 'Registration failed', 
        description: error.message || 'Failed to create account. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sales Signup | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Sign up for PCB Xpress Sales team" />
      </Helmet>
      <section className="min-h-screen py-16 md:py-20 relative flex items-center justify-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-orange-500/10 via-transparent to-emerald-200/30" />
        <div className="container max-w-2xl w-full mx-auto">
          <Card className="backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardHeader>
              <div className="flex items-center gap-2 text-orange-600">
                <UserPlus className="h-5 w-5" />
                <span className="text-xs tracking-wide uppercase">Join Sales Team</span>
              </div>
              <CardTitle>PCB Xpress Sales</CardTitle>
              <p className="text-sm text-muted-foreground">Create your sales team account</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      name="name"
                      type="text"
                      placeholder="Name"
                      value={values.name}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="name@pcbxpress.com"
                      value={values.email}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      name="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={values.phone}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={values.department} onValueChange={(value) => setValues({...values, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="presales">Pre-Sales</SelectItem>
                        <SelectItem value="business-development">Business Development</SelectItem>
                        <SelectItem value="account-management">Account Management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
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
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={values.confirmPassword}
                        onChange={onChange}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-primary"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="experience">Experience (years)</Label>
                  <Select value={values.experience} onValueChange={(value) => setValues({...values, experience: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 years</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5-10">5-10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    name="address"
                    placeholder="Your address..."
                    value={values.address}
                    onChange={onChange}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    name="notes"
                    placeholder="Any additional information or qualifications..."
                    value={values.notes}
                    onChange={onChange}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <div className="text-xs text-muted-foreground mt-6 space-y-2">
                <div className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Your account will require admin approval before activation</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Already have an account?</span>
                  <Link to="/sales/login" className="hover:text-primary">Sign In</Link>
                </div>
                <div className="flex justify-between items-center">
                  <span>Back to main site</span>
                  <Link to="/" className="hover:text-primary">Home</Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default SalesSignupPage;
