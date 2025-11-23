21:26:22.670 Running build in Washington, D.C., USA (East) – iad1
21:26:22.671 Build machine configuration: 2 cores, 8 GB
21:26:22.820 Cloning github.com/suitwoonsui/SuiTwoShooter (Branch: sui-integration, Commit: 93eb083)
21:26:24.018 Cloning completed: 1.198s
21:26:24.191 Restored build cache from previous deployment (HmJGrvVQmXB4NqxKsZH75wr6viRm)
21:26:24.610 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
21:26:24.611 Running "vercel build"
21:26:25.048 Vercel CLI 48.10.5
21:26:25.368 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
21:26:25.376 Running "install" command: `npm install`...
21:26:26.806 
21:26:26.807 up to date, audited 326 packages in 1s
21:26:26.808 
21:26:26.808 136 packages are looking for funding
21:26:26.808   run `npm fund` for details
21:26:26.808 
21:26:26.808 found 0 vulnerabilities
21:26:26.837 Detected Next.js version: 15.5.6
21:26:26.838 Running "npm run build"
21:26:26.946 
21:26:26.947 > suitwo-backend@1.0.0 build
21:26:26.947 > next build
21:26:26.947 
21:26:27.897  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
21:26:28.052    ▲ Next.js 15.5.6
21:26:28.053 
21:26:28.131    Creating an optimized production build ...
21:26:28.907  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
21:26:33.499  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
21:26:34.406  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
21:26:35.329  ✓ Compiled successfully in 4.7s
21:26:35.333    Linting and checking validity of types ...
21:26:42.144 Failed to compile.
21:26:42.144 
21:26:42.145 ./app/api/badges/[address]/migrate-data/route.ts:85:7
21:26:42.146 Type error: Object literal may only specify known properties, and 'filter' does not exist in type 'QueryEventsParams'.
21:26:42.146 
21:26:42.146 [0m [90m 83 |[39m         }[33m,[39m
21:26:42.146  [90m 84 |[39m       }[33m,[39m
21:26:42.146 [31m[1m>[22m[39m[90m 85 |[39m       filter[33m:[39m {
21:26:42.146  [90m    |[39m       [31m[1m^[22m[39m
21:26:42.146  [90m 86 |[39m         [33mSender[39m[33m:[39m address[33m,[39m
21:26:42.146  [90m 87 |[39m       }[33m,[39m
21:26:42.146  [90m 88 |[39m       limit[33m:[39m [35m10[39m[33m,[39m[0m
21:26:42.168 Next.js build worker exited with code: 1 and signal: null
21:26:42.191 Error: Command "npm run build" exited with 1