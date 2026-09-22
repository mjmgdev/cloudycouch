import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Terminal,
  Check,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  KeyRound,
  Lock,
  Server,
  Layers,
  Cpu,
  Zap,
  Info,
  ExternalLink,
  Code2,
  BookOpen,
} from 'lucide-react';
import { useModalEscape } from '../utils/modalStack';

export default function Header({
  status,
  onRefresh,
  onToggleDemo,
  onDisconnect,
  isRefreshing,
  theme = 'dark',
  onToggleTheme,
  sidebarOpen = true,
  onToggleSidebar,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [guideTab, setGuideTab] = useState('methods'); // 'methods' | 'environments' | 'security'

  useModalEscape({
    isOpen: showHelp,
    onEscape: () => setShowHelp(false),
    zIndex: 99999,
    id: 'connection-guide-modal',
  });

  const isDemo = status?.demoMode;
  const isConnected = status?.connected;

  return (
    <header className="app-header">
      <div className="brand-section">
        {/* Sidebar Hide/Show Toggle */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide sidebar (Ctrl+B)' : 'Show sidebar (Ctrl+B)'}
          style={{ padding: '6px' }}
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <div className="brand-logo-icon">
          <Database size={18} />
        </div>
        <div className="brand-title-wrap">
          <span className="brand-title">CloudyCouch Studio</span>
          <span className="brand-subtitle">IBM Cloudant & CouchDB Console</span>
        </div>
      </div>

      <div className="header-status-group">
        {/* Connection Status Badge */}
        <div
          className={`status-badge ${
            isDemo ? 'demo' : isConnected ? 'connected' : 'disconnected'
          }`}
          title={
            isDemo
              ? 'Running in local interactive sandbox mode'
              : isConnected
              ? `Connected to ${status?.url} (${status?.authType || 'Auth'})`
              : `Connection error: ${status?.error || 'Unreachable'}`
          }
        >
          <div className="pulse-dot" />
          <span>
            {isDemo
              ? 'Sandbox'
              : isConnected
              ? `Live (${status?.latency || 10}ms)`
              : 'Disconnected'}
          </span>
          <span className="status-badge-subtext" style={{ opacity: 0.6, fontSize: '0.72rem', borderLeft: '1px solid currentColor', paddingLeft: '6px' }}>
            {status?.url || 'Local'}
          </span>
        </div>

        {/* Demo Toggle */}
        <button
          className={`btn btn-sm ${isDemo ? 'btn-secondary' : 'btn-ghost'}`}
          onClick={() => onToggleDemo(!isDemo)}
          title="Switch between live Cloudant and interactive offline sandbox"
          style={{ gap: '6px' }}
        >
          <Sparkles size={14} color={isDemo ? '#f59e0b' : '#94a3b8'} />
          <span className="demo-mode-btn-text">{isDemo ? 'Using Demo' : 'Live Mode'}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          className="btn btn-secondary btn-icon"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun size={15} color="#f59e0b" />
          ) : (
            <Moon size={15} color="#6366f1" />
          )}
        </button>

        {/* Refresh Button */}
        <button
          className="btn btn-secondary btn-icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh connection and data"
        >
          <RefreshCw size={15} className={isRefreshing ? 'spin-icon' : ''} />
        </button>

        {/* Disconnect Button */}
        {onDisconnect && (
          <button
            className="btn btn-secondary btn-sm header-disconnect-btn"
            onClick={onDisconnect}
            title="Disconnect and return to Connection screen"
            style={{ gap: '6px' }}
          >
            <LogOut size={13} color="#f43f5e" />
            <span className="disconnect-btn-text">Disconnect</span>
          </button>
        )}

        {/* Help / Setup Guide */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setShowHelp(true)}
          title="Connection methods, environments & architecture guide"
        >
          <HelpCircle size={17} />
        </button>
      </div>

      {/* Comprehensive Connection Guide Modal rendered via Portal to prevent stacking cut-off */}
      {showHelp &&
        createPortal(
          <div className="connection-guide-backdrop" onClick={() => setShowHelp(false)}>
            <div className="connection-guide-dialog" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8'
                  }}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Connection & Architecture Guide
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Authentication types, dev vs prod modes, and zero-exposure proxy architecture
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => setShowHelp(false)}
                  style={{ fontSize: '1.2rem', lineHeight: 1, padding: '6px' }}
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>

              {/* Guide Navigation Tabs */}
              <div className="guide-tabs-bar">
                <button
                  className={`guide-tab-btn ${guideTab === 'methods' ? 'active' : ''}`}
                  onClick={() => setGuideTab('methods')}
                >
                  <KeyRound size={14} />
                  <span>Connection Types</span>
                </button>
                <button
                  className={`guide-tab-btn ${guideTab === 'environments' ? 'active' : ''}`}
                  onClick={() => setGuideTab('environments')}
                >
                  <Terminal size={14} />
                  <span>Dev Mode vs Production</span>
                </button>
                <button
                  className={`guide-tab-btn ${guideTab === 'security' ? 'active' : ''}`}
                  onClick={() => setGuideTab('security')}
                >
                  <ShieldCheck size={14} />
                  <span>Architecture & Scenarios</span>
                </button>
              </div>

              {/* Guide Content Body */}
              <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(88vh - 130px)' }}>
                {guideTab === 'methods' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Method 1: IBM Cloud IAM API Key */}
                    <div className="guide-card-box">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          <KeyRound size={16} color="#38bdf8" />
                          <span>1. IBM Cloud IAM API Key</span>
                        </div>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          Recommended for Cloudant
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Best for modern IBM Cloudant deployments on IBM Cloud (URLs ending in <code>.cloudantnosqldb.appdomain.cloud</code>).
                        You provide your instance URL and IAM API Key. The backend proxy automatically negotiates with the IBM Cloud IAM token service (<code>https://iam.cloud.ibm.com/identity/token</code>) to generate OAuth Bearer tokens, caching and refreshing them seamlessly every hour.
                      </p>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                        <div style={{ color: 'var(--text-muted)' }}># Parameters:</div>
                        <div><strong style={{ color: '#38bdf8' }}>URL:</strong> <span style={{ color: 'var(--text-secondary)' }}>https://YOUR_INSTANCE.cloudantnosqldb.appdomain.cloud</span></div>
                        <div><strong style={{ color: '#38bdf8' }}>IAM API Key:</strong> <span style={{ color: 'var(--text-secondary)' }}>abCdEf12345... (from IBM Cloud Resource List)</span></div>
                      </div>
                    </div>

                    {/* Method 2: Basic Auth */}
                    <div className="guide-card-box">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          <Lock size={16} color="#10b981" />
                          <span>2. Basic Auth (Username & Password)</span>
                        </div>
                        <span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          CouchDB / Docker / Legacy
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        For local Apache CouchDB servers, Dockerized development databases, private cloud instances, or legacy Cloudant accounts.
                        Authenticates using standard HTTP Basic authentication headers (<code>Authorization: Basic ...</code>).
                      </p>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                        <div style={{ color: 'var(--text-muted)' }}># Examples:</div>
                        <div><strong style={{ color: '#10b981' }}>Local CouchDB:</strong> <span style={{ color: 'var(--text-secondary)' }}>http://localhost:5984 (admin / password)</span></div>
                        <div><strong style={{ color: '#10b981' }}>Docker:</strong> <span style={{ color: 'var(--text-secondary)' }}>http://127.0.0.1:5984</span></div>
                      </div>
                    </div>

                    {/* Method 3: Offline Interactive Sandbox */}
                    <div className="guide-card-box">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          <Sparkles size={16} color="#f59e0b" />
                          <span>3. Interactive Offline Sandbox</span>
                        </div>
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          Zero Setup
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Need to test queries, test JSON editors, or demonstrate the UI without connecting to a live database?
                        Toggle the <strong>Sandbox</strong> button at any time. It mounts an in-memory database suite with realistic collections, users, and transactions.
                      </p>
                    </div>
                  </div>
                )}

                {guideTab === 'environments' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Dev Mode Card */}
                    <div className="guide-card-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        <Zap size={16} color="#38bdf8" />
                        <span>Development Mode (<code>NODE_ENV !== 'production'</code>)</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        In local development, the Node server reads your local <code>.env</code> file on startup. When you load CloudyCouch Studio, the Connection Screen detects these variables and offers a convenient <strong>"⚡ Use .env Credentials"</strong> one-click button to pre-fill your connection form without typing.
                      </p>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                        <div style={{ color: 'var(--text-muted)' }}># .env file reference in project root:</div>
                        <div style={{ color: '#38bdf8' }}>CLOUDANT_URL=<span style={{ color: 'var(--text-secondary)' }}>https://example.cloudantnosqldb.appdomain.cloud</span></div>
                        <div style={{ color: '#38bdf8' }}>CLOUDANT_APIKEY=<span style={{ color: 'var(--text-secondary)' }}>your-ibm-iam-key</span></div>
                        <div style={{ color: 'var(--text-muted)', margin: '4px 0' }}># Or for basic auth / CouchDB:</div>
                        <div style={{ color: '#10b981' }}>CLOUDANT_USERNAME=<span style={{ color: 'var(--text-secondary)' }}>admin</span></div>
                        <div style={{ color: '#10b981' }}>CLOUDANT_PASSWORD=<span style={{ color: 'var(--text-secondary)' }}>your-password</span></div>
                      </div>
                    </div>

                    {/* Production Mode Card */}
                    <div className="guide-card-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        <Server size={16} color="#a855f7" />
                        <span>Production Mode (<code>NODE_ENV === 'production'</code>)</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        When deployed in production, automatic <code>.env</code> credential pre-filling is intentionally restricted. Every operator or user enters their credentials through the Connection Screen to initiate an isolated session, ensuring credentials are never exposed across teams or environments.
                      </p>
                    </div>
                  </div>
                )}

                {guideTab === 'security' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Security 1: Zero Client Exposure */}
                    <div className="guide-card-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: '#10b981' }}>
                        <ShieldCheck size={18} />
                        <span>Zero Client Exposure & Token Safety</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Your IAM API Keys and database passwords never reside in browser local storage or web client bundles. All communications are mediated through the secure local proxy server (<code>server/index.js</code>). Tokens are refreshed server-side and only session cookies / proxy headers are exchanged.
                      </p>
                    </div>

                    {/* Security 2: Seamless Disconnect */}
                    <div className="guide-card-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        <LogOut size={16} color="#f43f5e" />
                        <span>Instant Disconnect & Cluster Switching</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Click the <strong>Disconnect</strong> button located in the top header or the bottom of the sidebar at any time. This immediately flushes active connection state, revokes cached bearer tokens, and returns you to the Connection Screen so you can jump between dev, staging, or production clusters without restarting Node.
                      </p>
                    </div>

                    {/* Security 3: CORS & Browser Restrictions */}
                    <div className="guide-card-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        <Layers size={16} color="#38bdf8" />
                        <span>CORS & Network Restrictions Solved</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Modern web browsers block direct cross-origin API calls to IBM Cloudant and CouchDB endpoints if CORS is not explicitly configured on the remote server. CloudyCouch Studio bypasses this limitation transparently by serving as a dedicated local proxy.
                      </p>
                    </div>

                    {/* Pro-Tips */}
                    <div className="guide-card-box" style={{ borderLeft: '3px solid #38bdf8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: '#38bdf8' }}>
                        <Info size={16} />
                        <span>Pro-Tips for Power Users</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <li><strong>Peek Document (<kbd style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Alt+P</kbd>):</strong> Highlight any document ID or text in the JSON editor and press <kbd>Alt+P</kbd> or right-click to inspect that document in any database without losing your place.</li>
                        <li><strong>Wildcard DB Search:</strong> In the Target Database dropdown, type glob patterns like <code>proj*2026*</code> to filter through thousands of partitioned databases.</li>
                        <li><strong>Storage Analytics:</strong> Group databases by Project, Year, or Month to inspect total disk footprints and document density.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => setShowHelp(false)}>
                  Close Guide
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
