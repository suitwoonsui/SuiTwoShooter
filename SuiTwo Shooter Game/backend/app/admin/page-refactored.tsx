// ==========================================
// Admin Page - Refactored Main Component
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { Tab } from './types';
import { getStyles } from './utils/get-styles';
import { useWalletConnection } from './hooks/useWalletConnection';
import { WalletConnection } from './components/WalletConnection';
import { TabNavigation } from './components/TabNavigation';
import { ItemsTab } from './tabs/ItemsTab';
import { BadgesTab } from './tabs/BadgesTab';
import { MigrationTab } from './tabs/MigrationTab';
import { TournamentsTab } from './tabs/TournamentsTab';
import { SoundTestTab } from './tabs/SoundTestTab';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Use wallet connection hook
  const {
    adminAddress,
    connectedAddress,
    walletError,
    isAdminWalletConnected,
    connectWallet,
    disconnectWallet,
    availableWallets,
  } = useWalletConnection();

  // Get theme styles
  const styles = getStyles(darkMode);

  // Load dark mode preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminDarkMode');
      if (saved === 'true') {
        setDarkMode(true);
      }
    }
  }, []);

  // Save dark mode preference
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminDarkMode', String(newDarkMode));
    }
  };

  // Apply dark mode to body and html
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    body.style.backgroundColor = darkMode ? styles.bgPrimary : '#ffffff';
    body.style.color = styles.text;
    html.style.backgroundColor = darkMode ? styles.bgPrimary : '#ffffff';
    html.style.color = styles.text;
    return () => {
      body.style.backgroundColor = '';
      body.style.color = '';
      html.style.backgroundColor = '';
      html.style.color = '';
    };
  }, [darkMode, styles]);

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: darkMode ? styles.bgPrimary : '#ffffff',
      color: styles.text,
      transition: 'background-color 0.3s, color 0.3s'
    }}>
      <div style={{ 
        padding: '2rem', 
        maxWidth: '1000px', 
        margin: '0 auto', 
        fontFamily: 'system-ui'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>🔐 Admin Dashboard</h1>
          <button
            type="button"
            onClick={toggleDarkMode}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: darkMode ? styles.bgTertiary : styles.bgSecondary,
              color: styles.text,
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
            }}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Wallet Connection */}
        <WalletConnection
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          walletError={walletError}
          availableWallets={availableWallets}
          styles={styles}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
        />

        {!isAdminWalletConnected && (
          <div style={{ padding: '1rem', background: styles.bgWarning, borderRadius: '4px', marginBottom: '2rem', border: `1px solid ${styles.border}` }}>
            <strong>⚠️ Admin wallet required:</strong> Please connect the admin wallet to access admin functions.
          </div>
        )}

        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          styles={styles}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        {activeTab === 'items' && (
          <ItemsTab
            isAdminWalletConnected={isAdminWalletConnected}
            connectedAddress={connectedAddress}
            adminAddress={adminAddress}
            styles={styles}
          />
        )}

        {activeTab === 'badges' && (
          <BadgesTab
            isAdminWalletConnected={isAdminWalletConnected}
            connectedAddress={connectedAddress}
            adminAddress={adminAddress}
            styles={styles}
          />
        )}

        {activeTab === 'migration' && (
          <MigrationTab
            isAdminWalletConnected={isAdminWalletConnected}
            connectedAddress={connectedAddress}
            adminAddress={adminAddress}
            styles={styles}
          />
        )}

        {activeTab === 'tournaments' && (
          <TournamentsTab
            isAdminWalletConnected={isAdminWalletConnected}
            connectedAddress={connectedAddress}
            adminAddress={adminAddress}
            styles={styles}
          />
        )}

        {activeTab === 'sound-test' && (
          <SoundTestTab styles={styles} />
        )}

        {/* Security Notice */}
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', fontSize: '0.9rem', border: `1px solid ${styles.border}` }}>
          <strong style={{ color: styles.text }}>🔒 Security:</strong> This page requires:
          <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', color: styles.textSecondary }}>
            <li>Admin wallet connection (verified on frontend and backend)</li>
            <li>Server-side API key authentication</li>
            <li>Wallet address verification before allowing operations</li>
          </ul>
          {activeTab === 'badges' && (
            <p style={{ marginTop: '0.5rem', color: styles.textSecondary }}>
              <strong>⚠️ Testing Only:</strong> These functions are for testing purposes. In production, players mint their own badges.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

