13:49:22.650 Running build in Washington, D.C., USA (East) – iad1
13:49:22.650 Build machine configuration: 2 cores, 8 GB
13:49:22.774 Cloning github.com/suitwoonsui/SuiTwoShooter (Branch: sui-integration, Commit: 28aacbe)
13:49:23.493 Cloning completed: 719.000ms
13:49:24.089 Restored build cache from previous deployment (68odo2rbSrYCdzN7y4QksVDz1rxK)
13:49:24.416 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
13:49:24.417 Running "vercel build"
13:49:24.808 Vercel CLI 48.10.3
13:49:25.157 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
13:49:25.164 Running "install" command: `npm install`...
13:49:26.551 
13:49:26.552 up to date, audited 326 packages in 1s
13:49:26.553 
13:49:26.553 136 packages are looking for funding
13:49:26.553   run `npm fund` for details
13:49:26.553 
13:49:26.553 found 0 vulnerabilities
13:49:26.585 Detected Next.js version: 15.5.6
13:49:26.586 Running "npm run build"
13:49:26.696 
13:49:26.696 > suitwo-backend@1.0.0 build
13:49:26.696 > next build
13:49:26.696 
13:49:27.640  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
13:49:27.795    ▲ Next.js 15.5.6
13:49:27.795 
13:49:27.874    Creating an optimized production build ...
13:49:28.655  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
13:49:33.375  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
13:49:34.299  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
13:49:35.381  ✓ Compiled successfully in 5.0s
13:49:35.393    Linting and checking validity of types ...
13:49:41.272 Failed to compile.
13:49:41.274 
13:49:41.274 ./lib/sui/badge-service.ts:137:54
13:49:41.275 Type error: This comparison appears to be unintentional because the types 'string' and 'number' have no overlap.
13:49:41.275 
13:49:41.275 [0m [90m 135 |[39m         [36mif[39m (returnValue) {
13:49:41.275  [90m 136 |[39m           [90m// Parse return value (boolean as u8: 0 = false, 1 = true)[39m
13:49:41.275 [31m[1m>[22m[39m[90m 137 |[39m           [36mconst[39m hasBadge [33m=[39m returnValue[[35m1[39m] [33m===[39m [32m'1'[39m [33m||[39m returnValue[[35m1[39m] [33m===[39m [35m1[39m[33m;[39m
13:49:41.276  [90m     |[39m                                                      [31m[1m^[22m[39m
13:49:41.276  [90m 138 |[39m           [36mreturn[39m hasBadge[33m;[39m
13:49:41.276  [90m 139 |[39m         }
13:49:41.276  [90m 140 |[39m       }[0m
13:49:41.299 Next.js build worker exited with code: 1 and signal: null
13:49:41.321 Error: Command "npm run build" exited with 1