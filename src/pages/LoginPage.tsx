import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, ArrowRight, UserCircle2, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginAsDemo, register, login, profiles } = useAuthStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (e: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(e);
  };

  const handleDemoLogin = async () => {
    await loginAsDemo();
    navigate('/profiles');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    try {
      if (isRegistering) {
        if (!name.trim()) {
          setError('Name is required.');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }
        await register(email, name, password);
        navigate('/onboarding');
      } else {
        await login(email, password);
        navigate('/profiles');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-green-700 mb-4">
          <Leaf className="h-12 w-12" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-neutral-900 tracking-tight">
          Marudham 360
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Analyze. Protect. Grow.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-green-900/5 sm:rounded-2xl sm:px-10 border border-neutral-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-neutral-700">Full Name</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCircle2 className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-neutral-300 rounded-xl py-3 border bg-neutral-50"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-neutral-300 rounded-xl py-3 border bg-neutral-50"
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-neutral-300 rounded-xl py-3 border bg-neutral-50"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              {isRegistering ? 'Register Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleDemoLogin}
                className="w-full flex justify-center items-center py-3 px-4 border border-neutral-300 rounded-xl shadow-sm bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors gap-2 group"
              >
                <UserCircle2 className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                Continue as Demo Farmer
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:translate-x-1 transition-transform ml-auto" />
              </button>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm font-medium text-green-600 hover:text-green-500"
            >
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
