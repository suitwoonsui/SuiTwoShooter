09:15:06.285 Running build in Washington, D.C., USA (East) – iad1
09:15:06.285 Build machine configuration: 2 cores, 8 GB
09:15:06.425 Cloning github.com/suitwoonsui/SuiTwoShooter (Branch: sui-integration, Commit: 6f05bd2)
09:15:07.511 Cloning completed: 1.086s
09:15:07.682 Restored build cache from previous deployment (aXedgWKawqPenhdL7QP9kXZkGZAo)
09:15:08.047 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
09:15:08.048 Running "vercel build"
09:15:08.428 Vercel CLI 48.10.5
09:15:08.742 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
09:15:08.751 Running "install" command: `npm install`...
09:15:10.266 
09:15:10.267 up to date, audited 326 packages in 1s
09:15:10.267 
09:15:10.267 136 packages are looking for funding
09:15:10.268   run `npm fund` for details
09:15:10.268 
09:15:10.268 found 0 vulnerabilities
09:15:10.298 Detected Next.js version: 15.5.6
09:15:10.298 Running "npm run build"
09:15:10.402 
09:15:10.402 > suitwo-backend@1.0.0 build
09:15:10.403 > next build
09:15:10.403 
09:15:11.355  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
09:15:11.508    ▲ Next.js 15.5.6
09:15:11.509 
09:15:11.584    Creating an optimized production build ...
09:15:12.341  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
09:15:15.994  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
09:15:16.927  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
09:15:17.568  ✓ Compiled successfully in 3.5s
09:15:17.572    Linting and checking validity of types ...
09:15:24.247 Failed to compile.
09:15:24.248 
09:15:24.249 ./lib/sui/badge-service.ts:850:36
09:15:24.249 Type error: Cannot find name 'client'.
09:15:24.249 
09:15:24.249 [0m [90m 848 |[39m         txbCreate[33m.[39msetGasBudget([36mthis[39m[33m.[39mconfig[33m.[39msui[33m.[39mgasBudget)[33m;[39m
09:15:24.250  [90m 849 |[39m
09:15:24.250 [31m[1m>[22m[39m[90m 850 |[39m         [36mconst[39m resultCreate [33m=[39m [36mawait[39m client[33m.[39msignAndExecuteTransaction({
09:15:24.250  [90m     |[39m                                    [31m[1m^[22m[39m
09:15:24.250  [90m 851 |[39m           signer[33m:[39m [36mthis[39m[33m.[39madminWallet[33m.[39mgetKeypair()[33m,[39m
09:15:24.251  [90m 852 |[39m           transaction[33m:[39m txbCreate[33m,[39m
09:15:24.251  [90m 853 |[39m           options[33m:[39m {[0m
09:15:24.273 Next.js build worker exited with code: 1 and signal: null
09:15:24.295 Error: Command "npm run build" exited with 1