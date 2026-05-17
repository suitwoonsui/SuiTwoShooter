# Deployment IDs — moved to structured docs

**This file is retired.** All content has been moved to the deployment doc structure under `docs/deployment/`.

---

## Where to find everything

| Former content | New location |
|----------------|--------------|
| **Platform contract IDs (modular block)** | [docs/deployment/platform/CONTRACT_IDS.md](../../../docs/deployment/platform/CONTRACT_IDS.md) |
| **Platform contract IDs (legacy block)** | [docs/deployment/platform/CONTRACT_IDS.md](../../../docs/deployment/platform/CONTRACT_IDS.md#legacy-single-package-platform-do-not-use) |
| **Platform previous vault (OLD_VAULT_PACKAGE_ID)** | [docs/deployment/platform/CONTRACT_IDS.md](../../../docs/deployment/platform/CONTRACT_IDS.md#previous-vault-contract-reference) |
| **Game backend .env block** | [docs/deployment/shooter-game/CONTRACT_IDS.md](../../../docs/deployment/shooter-game/CONTRACT_IDS.md) |
| **Game previous vault cap (OLD_CORRIDOR_ADMIN_CAP)** | [docs/deployment/shooter-game/CONTRACT_IDS.md](../../../docs/deployment/shooter-game/CONTRACT_IDS.md#previous-vault-cap-reference) |
| **Reference, troubleshooting, publish TXs** | [docs/deployment/platform/REFERENCE.md](../../../docs/deployment/platform/REFERENCE.md) |
| **Deploy order, scripts** | [docs/deployment/platform/DEPLOY_ORDER.md](../../../docs/deployment/platform/DEPLOY_ORDER.md) |
| **Platform .env vs config** | [docs/deployment/platform/ENV_AND_SECRETS.md](../../../docs/deployment/platform/ENV_AND_SECRETS.md), [CONFIG_FILES.md](../../../docs/deployment/platform/CONFIG_FILES.md) |
| **Game .env** | [docs/deployment/shooter-game/ENV_AND_SECRETS.md](../../../docs/deployment/shooter-game/ENV_AND_SECRETS.md) |

---

## Recording new deployment outputs

- **Platform:** Update [docs/deployment/platform/CONTRACT_IDS.md](../../../docs/deployment/platform/CONTRACT_IDS.md) and `Aqueduct Platform/contracts/MODULAR_DEPLOYMENT.json` (and optionally `Aqueduct Platform/backend/config/contracts.testnet.json`).
- **Game (corridor IDs):** Update [docs/deployment/shooter-game/CONTRACT_IDS.md](../../../docs/deployment/shooter-game/CONTRACT_IDS.md).

**Index:** [docs/deployment/README.md](../../../docs/deployment/README.md)
