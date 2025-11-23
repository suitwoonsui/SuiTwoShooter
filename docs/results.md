21:32:41.072 Running build in Washington, D.C., USA (East) – iad1
21:32:41.072 Build machine configuration: 2 cores, 8 GB
21:32:41.349 Cloning github.com/suitwoonsui/SuiTwoShooter (Branch: sui-integration, Commit: f2b07ff)
21:32:42.778 Cloning completed: 1.428s
21:32:43.226 Restored build cache from previous deployment (HmJGrvVQmXB4NqxKsZH75wr6viRm)
21:32:43.635 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
21:32:43.635 Running "vercel build"
21:32:44.025 Vercel CLI 48.10.5
21:32:44.355 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
21:32:44.362 Running "install" command: `npm install`...
21:32:45.767 
21:32:45.768 up to date, audited 326 packages in 1s
21:32:45.768 
21:32:45.769 136 packages are looking for funding
21:32:45.769   run `npm fund` for details
21:32:45.769 
21:32:45.769 found 0 vulnerabilities
21:32:45.798 Detected Next.js version: 15.5.6
21:32:45.799 Running "npm run build"
21:32:45.923 
21:32:45.923 > suitwo-backend@1.0.0 build
21:32:45.923 > next build
21:32:45.923 
21:32:46.945  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
21:32:47.100    ▲ Next.js 15.5.6
21:32:47.101 
21:32:47.178    Creating an optimized production build ...
21:32:47.938  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
21:32:52.657  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
21:32:53.597  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
21:32:54.550  ✓ Compiled successfully in 4.9s
21:32:54.555    Linting and checking validity of types ...
21:33:01.112 Failed to compile.
21:33:01.113 
21:33:01.113 ./app/api/badges/[address]/migrate-data/route.ts:175:49
21:33:01.114 Type error: Parameter 'byte' implicitly has an 'any' type.
21:33:01.114 
21:33:01.114 [0m [90m 173 |[39m           [90m// If it's a hex string, convert it[39m
21:33:01.114  [90m 174 |[39m           [36mconst[39m hex [33m=[39m fields[33m.[39mimage_data[33m.[39mreplace([32m'0x'[39m[33m,[39m [32m''[39m)[33m;[39m
21:33:01.114 [31m[1m>[22m[39m[90m 175 |[39m           imageData [33m=[39m hex[33m.[39mmatch([35m/.{1,2}/g[39m)[33m?[39m[33m.[39mmap(byte [33m=>[39m parseInt(byte[33m,[39m [35m16[39m)) [33m||[39m [][33m;[39m
21:33:01.114  [90m     |[39m                                                 [31m[1m^[22m[39m
21:33:01.114  [90m 176 |[39m         }
21:33:01.114  [90m 177 |[39m       }
21:33:01.114  [90m 178 |[39m[0m
21:33:01.133 Next.js build worker exited with code: 1 and signal: null
21:33:01.153 Error: Command "npm run build" exited with 1