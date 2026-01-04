const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Parse URL and strip query string
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Normalize the path and resolve relative paths
  let requestPath = url.pathname;
  
  // Handle paths that go outside frontend directory (like /base/...)
  // Browser resolves ../../base/... to /base/... when page is at root
  let filePath;
  const projectRoot = path.resolve(__dirname);
  
  if (requestPath.startsWith('/base/')) {
    // Direct access to base directory - serve from project root
    // Browser resolves ../../base/... to /base/... when page is at root
    filePath = path.join(projectRoot, requestPath.substring(1)); // Remove leading /
  } else if (requestPath.startsWith('/assets/')) {
    // Assets are in apps/shooter-game/frontend/assets/assets/ (nested)
    // requestPath is like /assets/SuiTwo_Profile.webp
    const assetName = requestPath.substring(8); // Remove '/assets/'
    const nestedAssets = path.join(__dirname, 'apps', 'shooter-game', 'frontend', 'assets', 'assets', assetName);
    const frontendAssets = path.join(__dirname, 'apps', 'shooter-game', 'frontend', 'assets', assetName);
    const rootAssets = path.join(projectRoot, 'assets', assetName);
    
    // Try nested first (where assets actually are), then frontend, then root
    if (fs.existsSync(nestedAssets)) {
      filePath = nestedAssets;
    } else if (fs.existsSync(frontendAssets)) {
      filePath = frontendAssets;
    } else if (fs.existsSync(rootAssets)) {
      filePath = rootAssets;
    } else {
      // Log which paths were checked for debugging
      console.log(`⚠️ Asset not found: ${assetName}`);
      console.log(`   Checked: ${nestedAssets}`);
      console.log(`   Checked: ${frontendAssets}`);
      console.log(`   Checked: ${rootAssets}`);
      filePath = nestedAssets; // Will 404 but at least try nested location
    }
  } else if (requestPath.startsWith('/wallet-module/')) {
    // Wallet module - could be in base/wallet-module or root wallet-module
    const walletPath = requestPath.substring(1); // Remove leading /
    const baseWallet = path.join(projectRoot, 'base', walletPath);
    const rootWallet = path.join(projectRoot, walletPath);
    if (fs.existsSync(baseWallet)) {
      filePath = baseWallet;
    } else if (fs.existsSync(rootWallet)) {
      filePath = rootWallet;
    } else {
      filePath = baseWallet; // Will 404 but at least try
    }
  } else {
    // Normal path - serve from frontend directory
    const frontendBase = path.join(__dirname, 'apps', 'shooter-game', 'frontend');
    
    // Remove leading slash for path joining
    let relativePath = requestPath;
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }
    
    // Join with frontend base, then normalize to resolve .. segments
    filePath = path.join(frontendBase, relativePath);
    filePath = path.normalize(filePath);
    
    // If it's a directory or root, serve index.html
    if (requestPath === '' || requestPath.endsWith('/')) {
      filePath = path.join(frontendBase, 'index.html');
    }
  }
  
  // Security: Ensure file is within project directory
  if (!filePath.startsWith(projectRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 - Forbidden</h1>', 'utf-8');
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Only log 404s for non-asset files (assets are logged above if not found)
        if (!requestPath.startsWith('/assets/')) {
          console.log(`❌ 404: ${url.pathname} -> ${filePath}`);
        }
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<h1>404 - File Not Found</h1><p>Requested: ${url.pathname}</p><p>Resolved to: ${filePath}</p>`, 'utf-8');
      } else {
        console.log(`❌ Error reading ${filePath}: ${error.code}`);
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}/index.html`);
  console.log(`\n✨ Slush Wallet should now be detected!\n`);
});

