// ==========================================
// Admin Page - Reusable Wallet List Component
// Displays expandable list of wallets with pagination
// ==========================================

'use client';

import { ReactNode, useState, useEffect, useMemo } from 'react';
import { AdminStyles } from '../types';
import { CopyableAddress } from './CopyableAddress';

interface WalletListProps {
  styles: AdminStyles;
  wallets: string[];
  filteredWallets: string[];
  searchAddress: string;
  expandedWallets: Set<string>;
  onToggleExpansion: (address: string) => void;
  getWalletData: (address: string) => any;
  renderWalletContent: (address: string, isExpanded: boolean, walletData: any) => ReactNode;
  itemsPerPage?: number; // Optional: default to 20
}

export function WalletList({
  styles,
  wallets,
  filteredWallets,
  searchAddress,
  expandedWallets,
  onToggleExpansion,
  getWalletData,
  renderWalletContent,
  itemsPerPage = 20,
}: WalletListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when search or filtered wallets change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchAddress, filteredWallets.length]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredWallets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWallets = useMemo(() => {
    return filteredWallets.slice(startIndex, endIndex);
  }, [filteredWallets, startIndex, endIndex]);

  if (wallets.length === 0) {
    return null;
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <p style={{ margin: 0, color: styles.textSecondary }}>
          {searchAddress.trim() 
            ? `Found ${filteredWallets.length} wallet(s) matching "${searchAddress}" (${wallets.length} total):`
            : `Found ${wallets.length} wallet(s):`
          }
        </p>
        {filteredWallets.length > itemsPerPage && (
          <p style={{ margin: 0, color: styles.textSecondary, fontSize: '0.9rem' }}>
            Page {currentPage} of {totalPages} ({startIndex + 1}-{Math.min(endIndex, filteredWallets.length)} of {filteredWallets.length})
          </p>
        )}
      </div>
      {filteredWallets.length === 0 && searchAddress.trim() && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: styles.bgWarning, 
          borderRadius: '4px', 
          border: `1px solid ${styles.border}`,
          marginBottom: '0.5rem',
          color: styles.text
        }}>
          No wallets found matching "{searchAddress}". Try a different search term or discover all wallets.
        </div>
      )}
      <div>
        {paginatedWallets.map((address, index) => {
          const isExpanded = expandedWallets.has(address);
          const walletData = getWalletData(address);
          
          return (
            <div
              key={index}
              style={{
                marginBottom: '0.75rem',
                backgroundColor: styles.bgSecondary,
                borderRadius: '4px',
                border: `1px solid ${styles.border}`,
                overflow: 'hidden',
              }}
            >
              {/* Wallet Header - Clickable to expand/collapse */}
              <div
                className={`admin-wallet-header ${isExpanded ? 'active' : ''}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  onToggleExpansion(address);
                }}
                title="Click to expand/collapse"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
              >
                <CopyableAddress value={address} styles={styles} compact />
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div 
                  className="admin-scrollable"
                  style={{ 
                    padding: '1.5rem', 
                    backgroundColor: styles.bgTertiary,
                    maxHeight: '600px',
                    overflowY: 'auto',
                  }}
                >
                  {renderWalletContent(address, isExpanded, walletData)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Pagination Controls */}
      {filteredWallets.length > itemsPerPage && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '0.5rem',
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: styles.bgSecondary,
          borderRadius: '4px',
          border: `1px solid ${styles.border}`,
        }}>
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentPage === 1 ? styles.bgTertiary : styles.bgPrimary,
              color: currentPage === 1 ? styles.textSecondary : styles.text,
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            ← Previous
          </button>
          
          {/* Page Numbers */}
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                // Show all pages if 5 or fewer
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                // Show first 5 pages
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                // Show last 5 pages
                pageNum = totalPages - 4 + i;
              } else {
                // Show pages around current page
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageClick(pageNum)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: currentPage === pageNum ? styles.bgPrimary : styles.bgTertiary,
                    color: currentPage === pageNum ? styles.text : styles.textSecondary,
                    border: `1px solid ${currentPage === pageNum ? styles.buttonPrimary : styles.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: currentPage === pageNum ? '600' : '400',
                    minWidth: '2.5rem',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentPage === totalPages ? styles.bgTertiary : styles.bgPrimary,
              color: currentPage === totalPages ? styles.textSecondary : styles.text,
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

