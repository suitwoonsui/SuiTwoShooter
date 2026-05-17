// ==========================================
// Admin Page Utilities - Styles Helper
// ==========================================

import { AdminStyles } from '../types';

/**
 * Get theme styles based on dark mode
 */
export const getStyles = (darkMode: boolean): AdminStyles => {
  if (darkMode) {
    return {
      bgPrimary: '#1a1a1a',
      bgSecondary: '#2d2d2d',
      bgTertiary: '#3a3a3a',
      bgSuccess: '#1e4620',
      bgError: '#4a1e1e',
      bgWarning: '#4a3e1e',
      bgInfo: '#1e3a4a',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0',
      textError: '#ff6b6b',
      textSuccess: '#81c784',
      border: '#404040',
      borderSuccess: '#4caf50',
      borderError: '#f44336',
      buttonPrimary: '#2196F3',
      buttonDisabled: '#666',
      buttonSuccess: '#4CAF50',
      buttonDanger: '#f44336',
      inputBg: '#2d2d2d',
      colorScheme: 'dark',
      success: '#4CAF50',
      danger: '#f44336',
      heading: '#e0e0e0',
      button: {
        padding: '0.5rem 1rem',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.9rem',
      },
    };
  } else {
    return {
      bgPrimary: '#ffffff',
      bgSecondary: '#f5f5f5',
      bgTertiary: '#e0e0e0',
      bgSuccess: '#d4edda',
      bgError: '#f8d7da',
      bgWarning: '#fff3cd',
      bgInfo: '#d1ecf1',
      text: '#333333',
      textSecondary: '#666666',
      textError: '#dc3545',
      textSuccess: '#155724',
      border: '#cccccc',
      borderSuccess: '#c3e6cb',
      borderError: '#f5c6cb',
      buttonPrimary: '#2196F3',
      buttonDisabled: '#cccccc',
      buttonSuccess: '#4CAF50',
      buttonDanger: '#f44336',
      inputBg: '#ffffff',
      colorScheme: 'light',
      success: '#4CAF50',
      danger: '#f44336',
      heading: '#333333',
      button: {
        padding: '0.5rem 1rem',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.9rem',
      },
    };
  }
};

