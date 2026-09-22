import React, { useState, useEffect } from 'react';
import {
  Database,
  Key,
  User,
  Lock,
  Eye,
  EyeOff,
  Activity,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Terminal,
  Sun,
  Moon,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/cloudantApi';

export default function ConnectionScreen({
  status,
  onConnectSuccess,
  onConnectSandbox,
  theme = 'dark',
  onToggleTheme,
}) {
  const [url, setUrl] = useState(() => localStorage.getItem('cloudant_last_url') || '');
  const [authType, setAuthType] = useState(() => localStorage.getItem('cloudant_last_authtype') || 'apikey');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string, latency: number, version: string }
  const [errorMessage, setErrorMessage] = useState(null);

  // Keep last URL & auth type in localStorage
  useEffect(() => {
    if (url) localStorage.setItem('cloudant_last_url', url);
  }, [url]);

  useEffect(() => {
    if (authType) localStorage.setItem('cloudant_last_authtype', authType);
  }, [authType]);

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setErrorMessage('Please enter your Cloudant or CouchDB instance URL');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    try {
      const payload = {
        url: url.trim(),
        authType,
        apiKey: authType === 'apikey' ? apiKey.trim() : undefined,
        username: authType === 'basic' ? username.trim() : undefined,
        password: authType === 'basic' ? password : undefined,
      };

      const res = await api.testConnection(payload);
      setTestResult({
        success: true,
        latency: res.latency,
        version: res.version,
        message: `Successfully connected to ${res.version} in ${res.latency}ms`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Connection failed. Please verify your URL and credentials.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async (e) => {
    e?.preventDefault();
    if (!url.trim()) {
      setErrorMessage('Please enter your Cloudant or CouchDB instance URL');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const payload = {
        url: url.trim(),
        authType,
        apiKey: authType === 'apikey' ? apiKey.trim() : undefined,
        username: authType === 'basic' ? username.trim() : undefined,
        password: authType === 'basic' ? password : undefined,
      };

      const res = await api.connect(payload);
      if (onConnectSuccess) {
        onConnectSuccess(res);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to establish connection. Check your credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectWithEnv = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const res = await api.connect({ useEnv: true });
      if (onConnectSuccess) {
        onConnectSuccess(res);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to connect using .env credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  const isDev = Boolean(status?.isDev);
  const hasEnv = Boolean(status?.envConfigured);

  return (
    <div className="connection-screen-wrap">
      {/* Background ambient lighting */}
      <div className="connection-bg-glow glow-1" />
      <div className="connection-bg-glow glow-2" />

      {/* Top Bar with theme toggle */}
      <header className="connection-top-bar">
        <div className="brand-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="brand-logo-icon">
            <Database size={18} />
          </div>
          <span className="brand-title" style={{ fontSize: '1.05rem' }}>CloudyCouch Studio</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDev && (
            <span className="badge-dev-mode" title="Environment variables enabled in local development">
              <Terminal size={12} />
              <span>Dev Mode</span>
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
          </button>
        </div>
      </header>

      {/* Main Connection Card Container */}
      <main className="connection-main-container">
        <div className="connection-card">
          {/* Card Header / Hero */}
          <div className="connection-card-header">
            <div className="connection-hero-icon">
              <Database size={28} />
            </div>
            <h1 className="connection-card-title">Connect to IBM Cloudant</h1>
            <p className="connection-card-subtitle">
              Enter your instance URL and authentication details to access your databases, inspect documents, and run queries.
            </p>
          </div>

          {/* Quick Connect with .env in Dev Mode */}
          {isDev && hasEnv && (
            <div className="connection-env-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={15} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Local .env Credentials Detected
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Fast-track into your configured development database.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConnectWithEnv}
                disabled={isConnecting}
              >
                {isConnecting ? <RefreshCw size={13} className="spin-icon" /> : <ArrowRight size={13} />}
                <span>Use .env</span>
              </button>
            </div>
          )}

          {/* Connection Form */}
          <form onSubmit={handleConnect} className="connection-form">
            {/* Instance URL */}
            <div className="form-group">
              <label className="form-label" htmlFor="cloudant-url">
                Instance URL
              </label>
              <div className="input-with-icon">
                <Database size={15} className="input-lead-icon" />
                <input
                  id="cloudant-url"
                  type="url"
                  className="form-input connection-input"
                  placeholder="https://xxx-bluemix.cloudantnosqldb.appdomain.cloud"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setTestResult(null);
                    setErrorMessage(null);
                  }}
                  autoFocus
                  required
                />
              </div>
              <span className="form-help">
                e.g. <code>https://&lt;account&gt;.cloudantnosqldb.appdomain.cloud</code> or <code>http://localhost:5984</code>
              </span>
            </div>

            {/* Authentication Scheme Selector */}
            <div className="form-group">
              <label className="form-label">Authentication Scheme</label>
              <div className="auth-type-segmented-control">
                <button
                  type="button"
                  className={`auth-type-tab ${authType === 'apikey' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthType('apikey');
                    setTestResult(null);
                  }}
                >
                  <Key size={14} />
                  <span>IBM IAM API Key</span>
                  <span className="recommended-badge">Recommended</span>
                </button>
                <button
                  type="button"
                  className={`auth-type-tab ${authType === 'basic' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthType('basic');
                    setTestResult(null);
                  }}
                >
                  <User size={14} />
                  <span>Basic Auth (User/Pass)</span>
                </button>
              </div>
            </div>

            {/* Credentials Fields */}
            {authType === 'apikey' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="cloudant-apikey">
                  IAM API Key / Token
                </label>
                <div className="input-with-icon">
                  <Key size={15} className="input-lead-icon" />
                  <input
                    id="cloudant-apikey"
                    type={showSecret ? 'text' : 'password'}
                    className="form-input connection-input"
                    placeholder="Enter IBM Cloud IAM API Key..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    required={authType === 'apikey'}
                  />
                  <button
                    type="button"
                    className="input-trail-icon-btn"
                    onClick={() => setShowSecret((prev) => !prev)}
                    title={showSecret ? 'Hide key' : 'Show key'}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <span className="form-help">
                  IBM Cloudant automatically exchanges your API Key for ephemeral IAM Bearer tokens server-side.
                </span>
              </div>
            ) : (
              <div className="basic-auth-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="cloudant-username">
                    Username
                  </label>
                  <div className="input-with-icon">
                    <User size={15} className="input-lead-icon" />
                    <input
                      id="cloudant-username"
                      type="text"
                      className="form-input connection-input"
                      placeholder="Cloudant or CouchDB user"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setTestResult(null);
                      }}
                      required={authType === 'basic'}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cloudant-password">
                    Password
                  </label>
                  <div className="input-with-icon">
                    <Lock size={15} className="input-lead-icon" />
                    <input
                      id="cloudant-password"
                      type={showSecret ? 'text' : 'password'}
                      className="form-input connection-input"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setTestResult(null);
                      }}
                      required={authType === 'basic'}
                    />
                    <button
                      type="button"
                      className="input-trail-icon-btn"
                      onClick={() => setShowSecret((prev) => !prev)}
                      title={showSecret ? 'Hide password' : 'Show password'}
                    >
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Test Connection Banner */}
            {testResult && (
              <div
                className={`connection-test-banner ${
                  testResult.success ? 'is-success' : 'is-error'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={16} className="test-banner-icon" />
                ) : (
                  <AlertCircle size={16} className="test-banner-icon" />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {testResult.success ? 'Connection Verified' : 'Connection Test Failed'}
                  </div>
                  <div style={{ fontSize: '0.74rem', marginTop: '2px', opacity: 0.9 }}>
                    {testResult.message}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="connection-test-banner is-error">
                <AlertCircle size={16} className="test-banner-icon" />
                <div style={{ fontSize: '0.78rem' }}>{errorMessage}</div>
              </div>
            )}

            {/* Action Buttons: Test Connection & Connect */}
            <div className="connection-actions-row">
              <button
                type="button"
                className="btn btn-secondary connection-btn"
                onClick={handleTestConnection}
                disabled={isTesting || isConnecting || !url.trim()}
              >
                {isTesting ? <RefreshCw size={14} className="spin-icon" /> : <Activity size={14} />}
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary connection-btn btn-connect"
                disabled={isConnecting || !url.trim()}
              >
                {isConnecting ? <RefreshCw size={14} className="spin-icon" /> : <ArrowRight size={14} />}
                <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
              </button>
            </div>
          </form>

          {/* Offline Demo Sandbox Alternate Option */}
          <div className="connection-divider">
            <span>OR</span>
          </div>

          <div className="connection-sandbox-section">
            <button
              type="button"
              className="btn btn-ghost connection-sandbox-btn"
              onClick={onConnectSandbox}
            >
              <Sparkles size={15} color="#f59e0b" />
              <span>Explore Offline Demo Sandbox</span>
            </button>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No credentials required. Fully simulated Cloudant instance with sample databases.
            </div>
          </div>

          {/* Security Guarantee Footer */}
          <div className="connection-security-note">
            <Shield size={13} color="#10b981" />
            <span>
              <strong>Zero Browser Exposure:</strong> Credentials are sent securely to your local backend proxy and never exposed to the client bundle.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
