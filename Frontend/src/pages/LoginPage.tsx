import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Plane } from 'lucide-react';

interface LoginPageProps {
  onBack: () => void;
  onSignup: () => void;
  onLoginSuccess: () => void;
}

interface LoginForm {
  email: string;
  password: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack, onSignup, onLoginSuccess }) => {
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [rememberMe, setRememberMe] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginForm> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Login successful:', formData);
      
      // Redirect to dashboard
      onLoginSuccess();
    } catch (error) {
      console.error('Login failed:', error);
      setErrors({ password: 'Invalid email or password' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div 
          className="absolute inset-0 bg-grid-pattern animate-pulse"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 200, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 200, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <button
          onClick={onBack}
          className="group p-3 rounded-xl transition-all duration-300 bg-slate-900/80 hover:bg-slate-800/90 border border-cyan-400/30 hover:border-cyan-400/60 backdrop-blur-md shadow-lg hover:shadow-cyan-400/20"
        >
          <ArrowLeft className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 rounded-2xl bg-slate-900/60 border border-cyan-400/30 backdrop-blur-md">
              <Plane className="w-8 h-8 text-cyan-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
                Flight Tracker
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400">Sign in to your account</p>
          </div>

          {/* Login Form */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-800/50 border ${
                      errors.email ? 'border-red-400' : 'border-slate-600'
                    } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 bg-slate-800/50 border ${
                      errors.password ? 'border-red-400' : 'border-slate-600'
                    } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-cyan-500 bg-slate-800 border-slate-600 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-slate-300">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Signup Link */}
            <div className="mt-6 text-center">
              <p className="text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={onSignup}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>

          {/* Social Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-400">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="w-full py-3 px-4 border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white font-medium rounded-lg transition-colors">
                Google
              </button>
              <button className="w-full py-3 px-4 border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white font-medium rounded-lg transition-colors">
                GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};