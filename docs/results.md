Solution summary
What we did
Added a One-Time Witness (OTW) to the badge_system module
Created a BADGE_SYSTEM struct with drop ability
Added an init() function that calls package::claim_and_keep() to automatically create the Publisher
Published the contract
The init() function ran automatically and created the Publisher
New Package ID: 0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed
Created the Display object
Used the Publisher to create the Display
Display Object ID: 0xd07a60a23e3d84c72ce14a76312a11fbf11a7c813ee3196d7508155af01773a7
Important information
Publisher Object ID: 0xf88aa1988898e4aaceae61297df3408957e11c41014cbecc05804e8df3cca802
Display Object ID: 0xd07a60a23e3d84c72ce14a76312a11fbf11a7c813ee3196d7508155af01773a7
New Package ID: 0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed
Next steps
Update your package ID references to the new package ID
The badge system is ready to use with Display support
Badges will now show proper metadata in wallets
The Publisher issue is resolved. The init() function ensures a Publisher is created automatically on every publish.