// ==========================================
// Admin Page - Shared Styles Component
// Provides reusable CSS classes for all admin tabs
// ==========================================

import { AdminStyles } from '../types';

interface AdminStylesProviderProps {
  styles: AdminStyles;
  children?: React.ReactNode;
}

/**
 * AdminStylesProvider component that injects shared CSS classes
 * for use across all admin tabs
 */
export function AdminStylesProvider({ styles, children }: AdminStylesProviderProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --bg-primary: ${styles.bgPrimary};
          --bg-secondary: ${styles.bgSecondary};
          --bg-tertiary: ${styles.bgTertiary};
          --bg-success: ${styles.bgSuccess};
          --bg-error: ${styles.bgError};
          --bg-warning: ${styles.bgWarning};
          --bg-info: ${styles.bgInfo};
          --text: ${styles.text};
          --text-secondary: ${styles.textSecondary};
          --text-error: ${styles.textError};
          --border: ${styles.border};
          --border-success: ${styles.borderSuccess};
          --border-error: ${styles.borderError};
          --button-primary: ${styles.buttonPrimary};
          --button-disabled: ${styles.buttonDisabled};
          --button-success: ${styles.buttonSuccess};
          --button-danger: ${styles.buttonDanger};
          --input-bg: ${styles.inputBg};
        }
        
        /* Number Input Spinner Removal */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        
        /* Section Containers */
        .admin-section {
          padding: 1.5rem;
          background-color: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        
        .admin-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .admin-section-title {
          margin: 0;
          color: var(--text);
          font-size: 1.5rem;
        }
        
        /* Cards */
        .admin-card {
          padding: 1rem;
          background-color: var(--bg-secondary);
          border-radius: 6px;
          border: 1px solid var(--border);
          transition: all 0.2s ease;
        }
        
        .admin-card-compact {
          padding: 0.5rem;
          background-color: var(--bg-secondary);
          border-radius: 6px;
          border: 1.5px solid var(--border);
          transition: all 0.2s ease;
        }
        
        .admin-card-hover:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .admin-card-positive {
          background-color: rgba(76, 175, 80, 0.12);
          border-color: #4CAF50;
          box-shadow: 0 1px 4px rgba(76, 175, 80, 0.15);
        }
        
        .admin-card-negative {
          background-color: rgba(244, 67, 54, 0.12);
          border-color: #f44336;
          box-shadow: 0 1px 4px rgba(244, 67, 54, 0.15);
        }
        
        /* Category/Group Containers */
        .admin-category-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          background-color: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }
        
        .admin-category-header {
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0.25rem;
        }
        
        .admin-category-title {
          margin: 0;
          color: var(--text);
          font-size: 0.95rem;
          font-weight: bold;
        }
        
        /* Grid Layouts */
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .admin-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .admin-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        
        .admin-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }
        
        /* Buttons */
        .admin-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1rem;
          transition: all 0.2s;
        }
        
        .admin-button:disabled {
          background-color: var(--button-disabled);
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .admin-button-primary {
          background-color: var(--button-primary);
          color: white;
        }
        
        .admin-button-primary:hover:not(:disabled) {
          opacity: 0.9;
        }
        
        .admin-button-success {
          background-color: var(--button-success);
          color: white;
        }
        
        .admin-button-success:hover:not(:disabled) {
          opacity: 0.9;
        }
        
        .admin-button-danger {
          background-color: var(--button-danger);
          color: white;
        }
        
        .admin-button-danger:hover:not(:disabled) {
          opacity: 0.9;
        }
        
        .admin-button-secondary {
          background-color: var(--bg-tertiary);
          color: var(--text);
          border: 1px solid var(--border);
        }
        
        .admin-button-secondary:hover:not(:disabled) {
          background-color: var(--bg-secondary);
        }
        
        .admin-button-compact {
          padding: 0.35rem 0.75rem;
          font-size: 0.9rem;
        }
        
        .admin-button-small {
          padding: 0.35rem;
          font-size: 0.9rem;
          font-weight: bold;
        }
        
        .admin-button-add {
          background-color: #4CAF50;
          color: white;
        }
        
        .admin-button-remove {
          background-color: #f44336;
          color: white;
        }
        
        /* Input Fields */
        .admin-input {
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 4px;
          background-color: var(--input-bg);
          color: var(--text);
          font-size: 1rem;
          width: 100%;
        }
        
        .admin-input:focus {
          outline: none;
          border-color: var(--button-primary);
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
        }
        
        .admin-input-compact {
          padding: 0.3rem 0.4rem;
          border: 1px solid var(--border);
          border-radius: 3px;
          background-color: var(--input-bg);
          color: var(--text);
          font-size: 0.8rem;
        }
        
        .admin-input-number {
          width: 38px;
          padding: 0.2rem 0.25rem;
          border-radius: 3px;
          background-color: var(--input-bg);
          color: var(--text);
          font-size: 0.85rem;
          font-weight: bold;
          text-align: center;
          flex-shrink: 0;
        }
        
        /* Labels */
        .admin-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
          color: var(--text);
        }
        
        .admin-label-small {
          color: var(--text-secondary);
          font-size: 0.75rem;
        }
        
        .admin-label-bold {
          color: var(--text);
          font-size: 0.75rem;
          font-weight: 500;
          flex-shrink: 0;
        }
        
        /* Badges */
        .admin-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: bold;
        }
        
        .admin-badge-primary {
          background-color: var(--button-primary);
          color: white;
        }
        
        .admin-badge-success {
          background-color: var(--button-success);
          color: white;
        }
        
        .admin-badge-danger {
          background-color: var(--button-danger);
          color: white;
        }
        
        .admin-badge-positive {
          color: #4CAF50;
          background-color: rgba(76, 175, 80, 0.15);
          padding: 0.15rem 0.35rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: bold;
          white-space: nowrap;
          flex-shrink: 0;
        }
        
        .admin-badge-negative {
          color: #f44336;
          background-color: rgba(244, 67, 54, 0.15);
          padding: 0.15rem 0.35rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: bold;
          white-space: nowrap;
          flex-shrink: 0;
        }
        
        /* Level Badge */
        .admin-level-badge {
          padding: 0.2rem 0.4rem;
          background-color: var(--bg-tertiary);
          border-radius: 3px;
          border: 1px solid var(--border);
          min-width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: stretch;
        }
        
        .admin-level-text {
          font-weight: bold;
          color: var(--text);
          font-size: 0.8rem;
        }
        
        /* Add Item Card */
        .admin-add-card {
          padding: 0.5rem;
          background-color: var(--bg-tertiary);
          border-radius: 6px;
          border: 1.5px dashed var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .admin-add-card:hover {
          background-color: var(--bg-secondary);
          border-color: var(--button-primary);
        }
        
        .admin-add-icon {
          font-size: 1.2rem;
          color: var(--text-secondary);
          margin-bottom: 0.15rem;
          font-weight: 300;
        }
        
        .admin-add-text {
          color: var(--text-secondary);
          font-size: 0.7rem;
          font-weight: 500;
          text-align: center;
        }
        
        /* Form Elements */
        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        
        .admin-form-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        
        .admin-form-buttons {
          display: flex;
          gap: 0.35rem;
        }
        
        .admin-form-button {
          flex: 1;
          padding: 0.35rem;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-weight: bold;
          font-size: 0.8rem;
        }
        
        .admin-form-button-submit {
          background-color: #4CAF50;
          color: white;
        }
        
        .admin-form-button-cancel {
          padding: 0.35rem 0.5rem;
          background-color: var(--bg-tertiary);
          color: var(--text);
          border: 1px solid var(--border);
        }
        
        /* Content Sections */
        .admin-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem;
          background-color: var(--bg-secondary);
          border-radius: 4px;
          border: 1px solid var(--border);
        }
        
        .admin-content-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        
        .admin-value {
          color: var(--text);
          font-size: 0.9rem;
          font-weight: bold;
        }
        
        .admin-value-large {
          font-size: 1.5rem;
          color: var(--text);
          margin-top: 0.5rem;
        }
        
        /* Section Navigation */
        .admin-nav {
          display: flex;
          gap: 1rem;
          border-bottom: 2px solid var(--border);
          padding-bottom: 1rem;
        }
        
        .admin-nav-button {
          padding: 0.75rem 1.5rem;
          background-color: transparent;
          color: var(--text);
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: bold;
          font-size: 1rem;
          text-transform: capitalize;
          transition: all 0.2s;
        }
        
        .admin-nav-button.active {
          background-color: var(--button-primary);
          color: white;
          border-bottom-color: var(--button-primary);
        }
        
        /* Scrollable Container */
        .admin-scrollable {
          max-height: 600px;
          overflow-y: auto;
          padding: 1rem;
          background-color: var(--bg-tertiary);
          border-radius: 4px;
          border: 1px solid var(--border);
        }
        
        /* Wallet Header */
        .admin-wallet-header {
          padding: 0.75rem 1rem;
          font-family: monospace;
          font-size: 0.9rem;
          color: var(--text);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--bg-secondary);
          transition: all 0.2s;
        }
        
        .admin-wallet-header:hover {
          background-color: var(--bg-tertiary);
        }
        
        .admin-wallet-header.active {
          background-color: var(--button-primary);
          color: white;
          font-weight: bold;
        }
        
        /* Error/Success Messages */
        .admin-message {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
        }
        
        .admin-message-error {
          background-color: var(--bg-error);
          border: 1px solid var(--border-error);
          color: var(--text-error);
        }
        
        .admin-message-success {
          background-color: var(--bg-success);
          border: 1px solid var(--border-success);
          color: var(--text);
        }
      `}} />
      {children}
    </>
  );
}

