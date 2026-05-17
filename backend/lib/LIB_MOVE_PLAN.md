# Lib move plan — PowerShell only

Move files from current locations into `lib/services/` subgroups using **PowerShell only** (e.g. `Move-Item`). Run from **`apps/shooter-game/backend`** (backend is current directory). Do **one move at a time** and fix imports/tests after each.

**Status:** Moves are done. Validation is in progress per [LIB_VALIDATION_PLAN.md](./LIB_VALIDATION_PLAN.md). **Note:** `lib/services/badge/queries/badge-queries.ts` and `lib/services/badge/transactions/badge-transactions.ts` were removed later (badge flow is platform-only; those modules were unused).

---

## 0. Set root and ensure target directories exist (run once)

From `apps/shooter-game/backend`:

```powershell
$Lib = "lib"
# Create all target subgroup directories (no error if already exist)
@(
  "$Lib\services\platform\client",
  "$Lib\services\platform\app-config",
  "$Lib\services\platform\logging",
  "$Lib\services\platform\errors",
  "$Lib\services\platform\validators",
  "$Lib\services\config\game-config",
  "$Lib\services\config\base-url",
  "$Lib\services\badge\core",
  "$Lib\services\badge\cache",
  "$Lib\services\badge\validation",
  "$Lib\services\badge\retry",
  "$Lib\services\badge\reconciliation",
  "$Lib\services\badge\transactions",
  "$Lib\services\badge\images",
  "$Lib\services\badge\queries",
  "$Lib\services\badge\utilities",
  "$Lib\services\tournament\core",
  "$Lib\services\tournament\scheduler",
  "$Lib\services\tournament\rewards-config",
  "$Lib\services\tournament\creator",
  "$Lib\services\tournament\cost",
  "$Lib\services\rewards\core",
  "$Lib\services\rewards\executor",
  "$Lib\services\rewards\batch",
  "$Lib\services\achievements\core",
  "$Lib\services\achievements\level",
  "$Lib\services\achievements\milestones",
  "$Lib\services\store\catalog",
  "$Lib\services\wallet\admin",
  "$Lib\services\wallet\transaction-helpers",
  "$Lib\services\wallet\balance",
  "$Lib\services\wallet\payments",
  "$Lib\services\payments\converter",
  "$Lib\services\validation\score",
  "$Lib\services\legacy\deprecated"
) | ForEach-Object { New-Item -ItemType Directory -Path $_ -Force }
```

---

## 1. Platform

| # | PowerShell command (run from `apps/shooter-game/backend`) |
|---|-----------------------------------------------------------|
| 1.1 | `Move-Item -Path "lib\api\platform-client.ts" -Destination "lib\services\platform\client\platform-client.ts"` |
| 1.2 | `Move-Item -Path "lib\platform-app-config.ts" -Destination "lib\services\platform\app-config\platform-app-config.ts"` |

---

## 2. Config

| # | PowerShell command |
|---|--------------------|
| 2.1 | `Move-Item -Path "lib\sui\game-config-service.ts" -Destination "lib\services\config\game-config\game-config-service.ts"` |
| 2.2 | `Move-Item -Path "lib\api-base-url.ts" -Destination "lib\services\config\base-url\api-base-url.ts"` |

---

## 3. Badge

| # | PowerShell command |
|---|--------------------|
| 3.1 | `Move-Item -Path "lib\sui\badge-service.ts" -Destination "lib\services\badge\core\badge-service.ts"` |
| 3.2 | `Move-Item -Path "lib\sui\badge-image-cache.ts" -Destination "lib\services\badge\cache\badge-image-cache.ts"` |
| 3.3 | `Move-Item -Path "lib\sui\badge-request-cache.ts" -Destination "lib\services\badge\cache\badge-request-cache.ts"` |
| 3.4 | `Move-Item -Path "lib\sui\badge-image-validator.ts" -Destination "lib\services\badge\validation\badge-image-validator.ts"` |
| 3.5 | `Move-Item -Path "lib\sui\badge-retry-queue.ts" -Destination "lib\services\badge\retry\badge-retry-queue.ts"` |
| 3.6 | `Move-Item -Path "lib\sui\badge-reconciliation.ts" -Destination "lib\services\badge\reconciliation\badge-reconciliation.ts"` |
| 3.7 | `Move-Item -Path "lib\sui\badge-service\badge-transactions.ts" -Destination "lib\services\badge\transactions\badge-transactions.ts"` |
| 3.8 | `Move-Item -Path "lib\sui\badge-service\badge-images.ts" -Destination "lib\services\badge\images\badge-images.ts"` |
| 3.9 | `Move-Item -Path "lib\sui\badge-service\badge-queries.ts" -Destination "lib\services\badge\queries\badge-queries.ts"` |
| 3.10 | `Move-Item -Path "lib\sui\badge-service\badge-utilities.ts" -Destination "lib\services\badge\utilities\badge-utilities.ts"` |

---

## 4. Tournament

| # | PowerShell command |
|---|--------------------|
| 4.1 | `Move-Item -Path "lib\sui\tournament-service.ts" -Destination "lib\services\tournament\core\tournament-service.ts"` |
| 4.2 | `Move-Item -Path "lib\services\tournament-scheduler.ts" -Destination "lib\services\tournament\scheduler\tournament-scheduler.ts"` |
| 4.3 | `Move-Item -Path "lib\services\default-rewards-config.ts" -Destination "lib\services\tournament\rewards-config\default-rewards-config.ts"` |
| 4.4 | `Move-Item -Path "lib\services\creator-reward-service.ts" -Destination "lib\services\tournament\creator\creator-reward-service.ts"` |
| 4.5 | `Move-Item -Path "lib\services\reward-cost-calculator.ts" -Destination "lib\services\tournament\cost\reward-cost-calculator.ts"` |

---

## 5. Rewards

| # | PowerShell command |
|---|--------------------|
| 5.1 | `Move-Item -Path "lib\sui\rewards-service.ts" -Destination "lib\services\rewards\core\rewards-service.ts"` |
| 5.2 | `Move-Item -Path "lib\rewards-platform-executor.ts" -Destination "lib\services\rewards\executor\rewards-platform-executor.ts"` |
| 5.3 | `Move-Item -Path "lib\services\batch-reward-distribution.ts" -Destination "lib\services\rewards\batch\batch-reward-distribution.ts"` |

---

## 6. Achievements

| # | PowerShell command |
|---|--------------------|
| 6.1 | `Move-Item -Path "lib\sui\achievement-service.ts" -Destination "lib\services\achievements\core\achievement-service.ts"` |
| 6.2 | `Move-Item -Path "lib\sui\milestone-level-manager.ts" -Destination "lib\services\achievements\level\milestone-level-manager.ts"` |
| 6.3 | `Move-Item -Path "lib\services\milestones\milestones-service.ts" -Destination "lib\services\achievements\milestones\milestones-service.ts"` |

---

## 7. Store (catalog)

| # | PowerShell command |
|---|--------------------|
| 7.1 | `Move-Item -Path "lib\sui\provisions-service.ts" -Destination "lib\services\store\catalog\provisions-service.ts"` |
| 7.2 | `Move-Item -Path "lib\services\provisions.ts" -Destination "lib\services\store\catalog\provisions.ts"` |
| 7.3 | `Move-Item -Path "lib\services\catalog-order.ts" -Destination "lib\services\store\catalog\catalog-order.ts"` |
| 7.4 | `Move-Item -Path "lib\services\item-catalog.ts" -Destination "lib\services\store\catalog\item-catalog.ts"` |

---

## 8. Wallet

| # | PowerShell command |
|---|--------------------|
| 8.1 | `Move-Item -Path "lib\sui\admin-wallet-service.ts" -Destination "lib\services\wallet\admin\admin-wallet-service.ts"` |
| 8.2 | `Move-Item -Path "lib\sui\balance-checker.ts" -Destination "lib\services\wallet\balance\balance-checker.ts"` |
| 8.3 | `Move-Item -Path "lib\sui\payment-transaction-builder.ts" -Destination "lib\services\wallet\payments\payment-transaction-builder.ts"` |

---

## 9. Payments

| # | PowerShell command |
|---|--------------------|
| 9.1 | `Move-Item -Path "lib\services\price-converter.ts" -Destination "lib\services\payments\converter\price-converter.ts"` |

---

## 10. Validation

| # | PowerShell command |
|---|--------------------|
| 10.1 | `Move-Item -Path "lib\score-validation.ts" -Destination "lib\services\validation\score\score-validation.ts"` |

---

## 11. Legacy (deprecated)

| # | PowerShell command |
|---|--------------------|
| 11.1 | `Move-Item -Path "lib\sui\game-pass-service.ts" -Destination "lib\services\legacy\deprecated\game-pass-service.ts"` |
| 11.2 | `Move-Item -Path "lib\sui\store-service.ts" -Destination "lib\services\legacy\deprecated\store-service.ts"` |

---

## 12. Additional moves (completed — move all from lib/sui)

All remaining files under `lib/sui` were moved so that **lib/sui is empty**. Completed moves:

| From | To |
|------|-----|
| `lib/sui/platform-logger.ts` | `lib/services/platform/logging/platform-logger.ts` |
| `lib/sui/platform-errors.ts` | `lib/services/platform/errors/platform-errors.ts` |
| `lib/sui/platform-validators.ts` | `lib/services/platform/validators/platform-validators.ts` |
| `lib/sui/transaction-helpers.ts` | `lib/services/wallet/transaction-helpers/transaction-helpers.ts` |
| `lib/sui/admin-wallet-service-base.ts` | `lib/services/wallet/admin/admin-wallet-service-base.ts` |
| `lib/sui/badge-logger.ts` | `lib/services/badge/utilities/badge-logger.ts` |
| `lib/sui/badge-errors.ts` | `lib/services/badge/validation/badge-errors.ts` |
| `lib/sui/badge-validators.ts` | `lib/services/badge/validation/badge-validators.ts` |
| `lib/sui/store-logger.ts` | `lib/services/legacy/deprecated/store-logger.ts` |
| `lib/sui/migration-logger.ts` | `lib/services/legacy/deprecated/migration-logger.ts` |
| `lib/sui/badge-service/discount-tiers-platform.ts` | `lib/services/badge/utilities/discount-tiers-platform.ts` |
| `lib/sui/badge-service/badge-service-stub.ts` | `lib/services/badge/core/badge-service-stub.ts` |

Target directories used: `platform/logging`, `platform/errors`, `platform/validators`, `wallet/transaction-helpers` (create if missing). Imports were updated to the new paths; `lib/sui` is now empty.

---

## Order and notes

- Run **section 0** once from `apps/shooter-game/backend` so all target directories exist.
- Run **one command at a time** (e.g. 1.1, then fix imports; then 1.2, then fix imports).
- After each move, update all imports that referenced the old path (e.g. `@/lib/api/platform-client` → `@/lib/services/platform/client/platform-client` or your chosen alias).
- **lib/sui**: All files have been moved into `lib/services/`; `lib/sui` is empty. Nothing remains in `lib/` or `lib/api/` that was previously listed as "Not moving" — those were moved in section 12.
- **Optional**: Remove empty `lib/sui/` and `lib/sui/badge-service/` directories if desired; `lib/services/milestones/` can be removed after its file is moved (see 6.3).
