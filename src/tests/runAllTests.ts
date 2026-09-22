/**
 * Unified Test Runner for Step 1 & Step 2
 */

import './foundation.test';
import './firebaseBackend.test';
import './phase2IntegrationAudit.test';
import './phase3aProductionUI.test';
import './threeDiceSystem.test';
import test from 'node:test';

test.after(() => {
  setTimeout(() => {
    process.exit(0);
  }, 100);
});
