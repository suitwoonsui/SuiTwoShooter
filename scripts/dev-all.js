#!/usr/bin/env node

/**
 * Development script to run all services locally
 * - Backend (Next.js) on port 3000
 * - Wallet module build (watches for changes)
 * - Frontend server on port 8000
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting all development services...\n');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(service, message) {
  const serviceColors = {
    backend: colors.blue,
    wallet: colors.cyan,
    frontend: colors.green,
  };
  const color = serviceColors[service] || colors.reset;
  console.log(`${color}[${service.toUpperCase()}]${colors.reset} ${message}`);
}

// Track processes
const processes = [];

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down all services...');
  processes.forEach(p => {
    try {
      p.kill('SIGINT');
    } catch (e) {
      // Ignore
    }
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  processes.forEach(p => {
    try {
      p.kill('SIGTERM');
    } catch (e) {
      // Ignore
    }
  });
  process.exit(0);
});

// 1. Start Backend
log('backend', 'Starting Next.js backend on http://localhost:3000');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..', 'backend'),
  stdio: 'inherit',
  shell: true,
});
processes.push(backend);

// Wait a bit for backend to start
setTimeout(() => {
  // 2. Build wallet module first, then watch
  log('wallet', 'Building wallet module...');
  const walletBuild = spawn('npm', ['run', 'build'], {
    cwd: path.join(__dirname, '..', 'wallet-module'),
    stdio: 'inherit',
    shell: true,
  });
  
  walletBuild.on('close', (code) => {
    if (code === 0) {
      log('wallet', '✅ Wallet module built successfully');
      log('wallet', '💡 To rebuild after changes, run: cd wallet-module && npm run build');
    } else {
      log('wallet', '❌ Wallet module build failed');
    }
  });
  
  // 3. Start Frontend
  log('frontend', 'Starting frontend server on http://localhost:8000');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  processes.push(frontend);
  
  console.log('\n' + colors.bright + colors.green + '✅ All services starting!' + colors.reset);
  console.log(colors.cyan + '\n📋 Services:' + colors.reset);
  console.log('  • Backend:  http://localhost:3000');
  console.log('  • Frontend: http://localhost:8000');
  console.log('  • Wallet:   Built to wallet-module/dist/');
  console.log(colors.yellow + '\n💡 Tips:' + colors.reset);
  console.log('  • Backend auto-reloads on file changes');
  console.log('  • Frontend: Refresh browser after changes');
  console.log('  • Wallet:   Run "cd wallet-module && npm run build" after changes');
  console.log('\n' + colors.bright + 'Press Ctrl+C to stop all services\n' + colors.reset);
}, 2000);

