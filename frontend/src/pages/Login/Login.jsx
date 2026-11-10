import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../services/api';
import AlertToast from '../../components/AlertToast';
import Logo from '../../components/Logo';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await authAPI.login({ username, password });
      
      if (res.success && res.data?.token) {
        // Save JWT token & admin data
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('admin', JSON.stringify(res.data.admin));
        localStorage.setItem('isAuthenticated', 'true');

        setAlert({
          type: 'success',
          message: `Welcome, ${res.data.admin.username}! Login successful.`,
        });

        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1000);
      } else {
        setError(res.message || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to server. Please try again later.');
      setAlert({
        type: 'error',
        message: err.message || 'Invalid username or password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <AlertToast alert={alert} onClose={() => setAlert(null)} />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-wrap">
            <Logo variant="full" height={46} />
          </div>
        </div>

        {error && <div className="login-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Admin Username</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-checkbox">
              <input type="checkbox" defaultChecked />
              <span>Remember me</span>
            </label>
          </div>

          <button type="submit" className="login-submit-btn" disabled={isLoading}>
            <span>{isLoading ? 'Signing In...' : 'Sign In to Portal'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
