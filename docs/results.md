12:28:42.704 Running build in Washington, D.C., USA (East) – iad1
12:28:42.705 Build machine configuration: 2 cores, 8 GB
12:28:42.723 Cloning github.com/suitwoonsui/SuiTwoShooter (Branch: sui-integration, Commit: 773c556)
12:28:42.725 Skipping build cache, deployment was triggered without cache.
12:28:44.026 Cloning completed: 1.302s
12:28:44.626 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
12:28:44.626 Running "vercel build"
12:28:45.012 Vercel CLI 48.10.3
12:28:45.398 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
12:28:45.405 Running "install" command: `npm install`...
12:29:31.929 
12:29:31.930 added 325 packages, and audited 326 packages in 46s
12:29:31.930 
12:29:31.931 136 packages are looking for funding
12:29:31.931   run `npm fund` for details
12:29:31.931 
12:29:31.931 found 0 vulnerabilities
12:29:31.994 Detected Next.js version: 15.5.6
12:29:31.995 Running "npm run build"
12:29:32.099 
12:29:32.100 > suitwo-backend@1.0.0 build
12:29:32.100 > next build
12:29:32.100 
12:29:32.837 Attention: Next.js now collects completely anonymous telemetry regarding usage.
12:29:32.839 This information is used to shape Next.js' roadmap and prioritize features.
12:29:32.839 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
12:29:32.839 https://nextjs.org/telemetry
12:29:32.839 
12:29:32.915    ▲ Next.js 15.5.6
12:29:32.916 
12:29:32.989    Creating an optimized production build ...
12:29:39.893 Failed to compile.
12:29:39.894 
12:29:39.895 ./lib/sui/badge-service.ts
12:29:39.895 Module parse failed: Identifier 'client' has already been declared (429:18)
12:29:39.895 File was processed with these loaders:
12:29:39.895  * ./node_modules/next/dist/build/webpack/loaders/next-flight-loader/index.js
12:29:39.896  * ./node_modules/next/dist/build/webpack/loaders/next-swc-loader.js
12:29:39.896 You may need an additional loader to handle the result of these loaders.
12:29:39.896 |             console.log(`🔧 [ADMIN BADGE] Minting badge for ${playerAddress}, tier: ${tier}`);
12:29:39.897 |             // Sign and execute with admin wallet
12:29:39.897 >             const client = this.getClient();
12:29:39.897 |             const keypair = this.adminWallet.getKeypair();
12:29:39.897 |             const result = await client.signAndExecuteTransaction({
12:29:39.898 
12:29:39.898 Import trace for requested module:
12:29:39.898 ./lib/sui/badge-service.ts
12:29:39.899 ./app/api/admin/badges/route.ts
12:29:39.899 
12:29:39.901 
12:29:39.901 > Build failed because of webpack errors
12:29:39.935 Error: Command "npm run build" exited with 1