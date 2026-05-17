'use client';

import React from 'react';

interface ScenarioData {
  entries: number;
  discount0: {
    finalPool: number;
    creatorReward: number;
    playerRewardsPool: number;
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
    appAdminRemainder: number;
    platformRevenue: number;
    appAdminRevenue: number;
    creatorNetRevenue: number;
  };
  discount20: {
    finalPool: number;
    creatorReward: number;
    playerRewardsPool: number;
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
    appAdminRemainder: number;
    platformRevenue: number;
    appAdminRevenue: number;
    creatorNetRevenue: number;
  };
}

const scenarios: ScenarioData[] = [
  {
    entries: 10,
    discount0: {
      finalPool: 10.00,
      creatorReward: 5.00,
      playerRewardsPool: 2.50,
      firstPlace: 1.25,
      secondPlace: 0.75,
      thirdPlace: 0.50,
      appAdminRemainder: 2.50,
      platformRevenue: 2.87,
      appAdminRevenue: 5.00,
      creatorNetRevenue: 0.00,
    },
    discount20: {
      finalPool: 8.00,
      creatorReward: 4.00,
      playerRewardsPool: 2.00,
      firstPlace: 1.00,
      secondPlace: 0.60,
      thirdPlace: 0.40,
      appAdminRemainder: 2.00,
      platformRevenue: 2.87,
      appAdminRevenue: 4.50,
      creatorNetRevenue: -1.00,
    },
  },
  {
    entries: 20,
    discount0: {
      finalPool: 20.00,
      creatorReward: 7.50,
      playerRewardsPool: 12.00,
      firstPlace: 6.00,
      secondPlace: 3.60,
      thirdPlace: 2.40,
      appAdminRemainder: 0.50,
      platformRevenue: 3.27,
      appAdminRevenue: 3.00,
      creatorNetRevenue: 2.50,
    },
    discount20: {
      finalPool: 16.00,
      creatorReward: 6.50,
      playerRewardsPool: 9.60,
      firstPlace: 4.80,
      secondPlace: 2.88,
      thirdPlace: 1.92,
      appAdminRemainder: 0.00,
      platformRevenue: 3.27,
      appAdminRevenue: 2.50,
      creatorNetRevenue: 1.50,
    },
  },
  {
    entries: 50,
    discount0: {
      finalPool: 50.00,
      creatorReward: 15.00,
      playerRewardsPool: 30.00,
      firstPlace: 15.00,
      secondPlace: 9.00,
      thirdPlace: 6.00,
      appAdminRemainder: 5.00,
      platformRevenue: 4.47,
      appAdminRevenue: 7.50,
      creatorNetRevenue: 10.00,
    },
    discount20: {
      finalPool: 40.00,
      creatorReward: 12.50,
      playerRewardsPool: 24.00,
      firstPlace: 12.00,
      secondPlace: 7.20,
      thirdPlace: 4.80,
      appAdminRemainder: 3.50,
      platformRevenue: 4.47,
      appAdminRevenue: 6.00,
      creatorNetRevenue: 7.50,
    },
  },
  {
    entries: 100,
    discount0: {
      finalPool: 100.00,
      creatorReward: 27.50,
      playerRewardsPool: 60.00,
      firstPlace: 30.00,
      secondPlace: 18.00,
      thirdPlace: 12.00,
      appAdminRemainder: 12.50,
      platformRevenue: 6.47,
      appAdminRevenue: 15.00,
      creatorNetRevenue: 22.50,
    },
    discount20: {
      finalPool: 80.00,
      creatorReward: 22.50,
      playerRewardsPool: 48.00,
      firstPlace: 24.00,
      secondPlace: 14.40,
      thirdPlace: 9.60,
      appAdminRemainder: 9.50,
      platformRevenue: 6.47,
      appAdminRevenue: 12.00,
      creatorNetRevenue: 17.50,
    },
  },
  {
    entries: 200,
    discount0: {
      finalPool: 200.00,
      creatorReward: 52.50,
      playerRewardsPool: 120.00,
      firstPlace: 60.00,
      secondPlace: 36.00,
      thirdPlace: 24.00,
      appAdminRemainder: 27.50,
      platformRevenue: 10.47,
      appAdminRevenue: 30.00,
      creatorNetRevenue: 47.50,
    },
    discount20: {
      finalPool: 160.00,
      creatorReward: 42.50,
      playerRewardsPool: 96.00,
      firstPlace: 48.00,
      secondPlace: 28.80,
      thirdPlace: 19.20,
      appAdminRemainder: 21.50,
      platformRevenue: 10.47,
      appAdminRevenue: 24.00,
      creatorNetRevenue: 37.50,
    },
  },
  {
    entries: 500,
    discount0: {
      finalPool: 500.00,
      creatorReward: 127.50,
      playerRewardsPool: 300.00,
      firstPlace: 150.00,
      secondPlace: 90.00,
      thirdPlace: 60.00,
      appAdminRemainder: 72.50,
      platformRevenue: 22.47,
      appAdminRevenue: 75.00,
      creatorNetRevenue: 122.50,
    },
    discount20: {
      finalPool: 400.00,
      creatorReward: 102.50,
      playerRewardsPool: 240.00,
      firstPlace: 120.00,
      secondPlace: 72.00,
      thirdPlace: 48.00,
      appAdminRemainder: 57.50,
      platformRevenue: 22.47,
      appAdminRevenue: 60.00,
      creatorNetRevenue: 97.50,
    },
  },
];

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function CurrencyCell({ value, isPositive = true }: { value: number; isPositive?: boolean }) {
  const color = value >= 0 && isPositive ? '#22c55e' : value < 0 ? '#ef4444' : '#64748b';
  return (
    <td style={{ color, fontWeight: 'bold' }}>
      {formatCurrency(value)}
    </td>
  );
}

function ScenarioTable({ scenario }: { scenario: ScenarioData }) {
  const playerRewardsPercent = scenario.entries <= 10 ? 25 : 60;
  
  return (
    <div style={{ 
      marginBottom: '40px', 
      padding: '20px', 
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <h2 style={{ 
        color: '#1e293b', 
        marginBottom: '20px',
        fontSize: '24px',
        borderBottom: '3px solid #3b82f6',
        paddingBottom: '10px'
      }}>
        {scenario.entries} Entries
        {scenario.entries <= 10 && (
          <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '10px' }}>
            (Player Rewards: {playerRewardsPercent}%)
          </span>
        )}
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 0% Discount */}
        <div>
          <h3 style={{ color: '#3b82f6', marginBottom: '15px', fontSize: '18px' }}>
            0% Discount
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', color: '#64748b' }}>Final Prize Pool</td>
                <CurrencyCell value={scenario.discount0.finalPool} isPositive={true} />
              </tr>
              <tr>
                <td style={{ padding: '8px', color: '#64748b' }}>Creator Reward</td>
                <CurrencyCell value={scenario.discount0.creatorReward} isPositive={true} />
              </tr>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <td style={{ padding: '8px', color: '#64748b' }}>Player Rewards Pool</td>
                <CurrencyCell value={scenario.discount0.playerRewardsPool} isPositive={true} />
              </tr>
              <tr>
                <td style={{ padding: '8px 8px 8px 24px', color: '#64748b', fontSize: '12px' }}>1st Place</td>
                <CurrencyCell value={scenario.discount0.firstPlace} isPositive={true} />
              </tr>
              <tr>
                <td style={{ padding: '8px 8px 8px 24px', color: '#64748b', fontSize: '12px' }}>2nd Place</td>
                <CurrencyCell value={scenario.discount0.secondPlace} isPositive={true} />
              </tr>
              <tr>
                <td style={{ padding: '8px 8px 8px 24px', color: '#64748b', fontSize: '12px' }}>3rd Place</td>
                <CurrencyCell value={scenario.discount0.thirdPlace} isPositive={true} />
              </tr>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <td style={{ padding: '8px', color: '#64748b' }}>App Admin Remainder</td>
                <CurrencyCell value={scenario.discount0.appAdminRemainder} isPositive={true} />
              </tr>
              <tr style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#fef3c7' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#92400e' }}>Platform Total Revenue</td>
                <CurrencyCell value={scenario.discount0.platformRevenue} isPositive={true} />
              </tr>
              <tr style={{ backgroundColor: '#fef3c7' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#92400e' }}>App Admin Total Revenue</td>
                <CurrencyCell value={scenario.discount0.appAdminRevenue} isPositive={true} />
              </tr>
              <tr style={{ backgroundColor: '#fef3c7' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#92400e' }}>Creator Net Revenue</td>
                <CurrencyCell value={scenario.discount0.creatorNetRevenue} isPositive={true} />
              </tr>
            </tbody>
          </table>
        </div>

        {/* 20% Discount */}
        <div>
          <h3 style={{ color: '#3b82f6', marginBottom: '15px', fontSize: '18px' }}>
            20% Discount (Max)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', color: '#64748b' }}>Final Prize Pool</td>
                <CurrencyCell value={scenario.discount20.finalPool} isPositive={true} />
              </tr>
              <tr>
                <td style={{ padding: '8px', color: '#64748b' }}>Creator Reward</td>
                <CurrencyCell value={scenario.discount20.creatorReward} isPositive={true} />
              </tr>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <td style={{ padding: '8px', color: '#64748b' }}>Player Rewards Pool</td>
                <CurrencyCell value={scenario.discount20.playerRewardsPool} isPositive={true} />
              </tr>
              <tr>
                <td style={{ padding: '8px 8px 8px 24px', color: '#64748b', fontSize: '12px' }}>1st Place</td>
                <CurrencyCell value={scenario.discount20.firstPlace} isPositive={true} />
              </tr>
              <tr>
                <td style={{ padding: '8px 8px 8px 24px', color: '#64748b', fontSize: '12px' }}>2nd Place</td>
                <CurrencyCell value={scenario.discount20.secondPlace} isPositive={true} />
              </tr>
              <tr>
                <td style={{ padding: '8px 8px 8px 24px', color: '#64748b', fontSize: '12px' }}>3rd Place</td>
                <CurrencyCell value={scenario.discount20.thirdPlace} isPositive={true} />
              </tr>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <td style={{ padding: '8px', color: '#64748b' }}>App Admin Remainder</td>
                <CurrencyCell value={scenario.discount20.appAdminRemainder} isPositive={true} />
              </tr>
              <tr style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#fef3c7' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#92400e' }}>Platform Total Revenue</td>
                <CurrencyCell value={scenario.discount20.platformRevenue} isPositive={true} />
              </tr>
              <tr style={{ backgroundColor: '#fef3c7' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#92400e' }}>App Admin Total Revenue</td>
                <CurrencyCell value={scenario.discount20.appAdminRevenue} isPositive={true} />
              </tr>
              <tr style={{ backgroundColor: '#fef3c7' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#92400e' }}>Creator Net Revenue</td>
                <CurrencyCell value={scenario.discount20.creatorNetRevenue} isPositive={true} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TournamentFeesPage() {
  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#ffffff',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          color: '#1e293b', 
          fontSize: '36px', 
          marginBottom: '10px',
          borderBottom: '4px solid #3b82f6',
          paddingBottom: '15px'
        }}>
          Tournament Ticket Fee Structure
        </h1>
        <p style={{ color: '#64748b', fontSize: '16px', marginTop: '10px' }}>
          Comprehensive breakdown of tournament scenarios with 0% and 20% discount levels
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#eff6ff', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '30px',
        borderLeft: '4px solid #3b82f6'
      }}>
        <h3 style={{ color: '#1e40af', marginBottom: '10px' }}>Key Calculation Rules</h3>
        <ul style={{ color: '#1e40af', margin: 0, paddingLeft: '20px' }}>
          <li><strong>Player Rewards:</strong> 25% of full prize pool for 1-10 entries, 60% for 11+ entries</li>
          <li><strong>Creator Reward:</strong> 50% of entry fees until $5.00 earned, then $5.00 + 25% of remaining (increased from 10% for better creator incentives)</li>
          <li><strong>Winner Distribution:</strong> 1st place gets 50%, 2nd gets 30%, 3rd gets 20% of player rewards pool</li>
          <li><strong>Platform Revenue:</strong> $2.50 creation fee share + $0.04 per ticket - $0.005 end tournament gas - $0.020 reward transfer gas</li>
          <li><strong>App Admin Revenue:</strong> $2.50 creation fee share + remainder from prize pool</li>
          <li><strong>Creator Net Revenue:</strong> Creator reward - $5.00 creation fee</li>
        </ul>
      </div>

      {scenarios.map((scenario) => (
        <ScenarioTable key={scenario.entries} scenario={scenario} />
      ))}

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Quick Reference Summary</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div>
            <h3 style={{ color: '#3b82f6', marginBottom: '15px' }}>Platform Total Revenue</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Entries</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>0% Discount</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>20% Discount</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.entries}>
                    <td style={{ padding: '8px', color: '#64748b' }}>{s.entries}</td>
                    <CurrencyCell value={s.discount0.platformRevenue} />
                    <CurrencyCell value={s.discount20.platformRevenue} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ color: '#3b82f6', marginBottom: '15px' }}>App Admin Total Revenue</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Entries</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>0% Discount</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>20% Discount</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.entries}>
                    <td style={{ padding: '8px', color: '#64748b' }}>{s.entries}</td>
                    <CurrencyCell value={s.discount0.appAdminRevenue} />
                    <CurrencyCell value={s.discount20.appAdminRevenue} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ color: '#3b82f6', marginBottom: '15px' }}>Creator Net Revenue</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Entries</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>0% Discount</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>20% Discount</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.entries}>
                    <td style={{ padding: '8px', color: '#64748b' }}>{s.entries}</td>
                    <CurrencyCell value={s.discount0.creatorNetRevenue} />
                    <CurrencyCell value={s.discount20.creatorNetRevenue} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#f0fdf4',
        borderRadius: '8px',
        border: '1px solid #86efac'
      }}>
        <p style={{ color: '#166534', margin: 0, fontSize: '14px' }}>
          <strong>Note:</strong> All revenue calculations include the $5.00 tournament creation fee split ($2.50 to platform, $2.50 to app admin). 
          Creator net revenue accounts for the $5.00 creation fee they pay. At 10 entries with 0% discount, creators break even exactly.
          Creator rewards increased to 25% (from 10%) to provide better incentives - at 20 entries, creators now earn $2.50 net (vs previous $1.00).
        </p>
      </div>
    </div>
  );
}
