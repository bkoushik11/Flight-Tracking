import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Plane } from 'lucide-react';
import AuthService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: () => void;
  onSuccess?: () => void;
}

interface LoginForm {
  email: string;
  password: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack, onLoginSuccess, onSuccess }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginForm>>({});


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
      const response = await AuthService.login(formData);
      console.log('Login successful:', response);
      
      // Update auth context with user data
      if (response.success && response.data && response.data.user) {
        login({
          id: response.data.user._id,
          fullName: response.data.user.fullName,
          email: response.data.user.email
        });
      }
      
      // If there's a success callback (from flight click), use it
      // Otherwise, use the default login success handler
      if (onSuccess) {
        onSuccess();
      } else {
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle different types of errors
      if (error.message.includes('Invalid email or password')) {
        setErrors({ password: 'Invalid email or password' });
      } else {
        setErrors({ password: 'Login failed. Please try again.' });
      }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 relative overflow-hidden flex">
      {/* Left Side - Logo */}
      <div className="w-1/2 flex items-center justify-center">
        <img 
          src="/WhatsApp Image 2025-09-25 at 12.25.57_dfd8943f.jpg" 
          alt="Situational Awareness Suit Logo" 
          className="h-80 w-auto rounded-lg shadow-lg"
        />
      </div>

      {/* Thin transparent line separator */}
      <div className="absolute left-1/2 top-0 bottom-0 flex items-center justify-center">
        <div className="h-4/5 w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-1/2 relative">
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

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 rounded-2xl bg-slate-900/60 border border-cyan-400/30 backdrop-blur-md">
                <Plane className="w-8 h-8 text-cyan-400" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
                  Situational Awareness Suit
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              {/* Info Text */}
              <div className="mt-6 text-center">
                <p className="text-slate-400 text-sm">
                  Contact administrator for account access
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};