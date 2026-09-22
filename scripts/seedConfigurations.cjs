/**
 * Production Configuration Seeder
 * Seeds game configurations (/configurations/{configId}) into Cloud Firestore via REST API with IAM credentials.
 */

const crypto = require('crypto');
const https = require('https');

let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
raw = raw.replace(/^n/, '').replace(/[\s\\]+$/, '');
const privateKey = '-----BEGIN PRIVATE KEY-----\n' + raw.split('\\n').join('\n') + '\n-----END PRIVATE KEY-----\n';
const clientEmail = 'firebase-adminsdk-fbsvc@' + process.env.VITE_FIREBASE_PROJECT_ID + '.iam.gserviceaccount.com';

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const claim = Buffer.from(JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    })).toString('base64url');

    const signature = crypto.sign('RSA-SHA256', Buffer.from(header + '.' + claim), privateKey).toString('base64url');
    const jwt = header + '.' + claim + '.' + signature;

    const postData = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt;
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error(data));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function writeDoc(token, docId, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const body = JSON.stringify({ fields });

  return new Promise((resolve, reject) => {
    const path = '/v1/projects/' + process.env.VITE_FIREBASE_PROJECT_ID + '/databases/(default)/documents/configurations/' + docId;
    const req = https.request('https://firestore.googleapis.com' + path, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let resData = '';
      res.on('data', c => resData += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(resData));
        } else {
          reject(new Error('Firestore error ' + res.statusCode + ': ' + resData));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const DEFAULT_STANDARD_SPACES = [
  { id: 'space_0', index: 0, name: 'START / GO', type: 'start', description: 'Collect 200 ƁM salary when passing or landing.' },
  { id: 'space_1', index: 1, name: 'Seed Capital Alpha', type: 'property', group: 'Seed Stage', baseCost: 60, rentTiers: [6, 30, 90, 270, 400, 550] },
  { id: 'space_2', index: 2, name: 'Angel Syndicate', type: 'market_event', description: 'Draw a dynamic Market Event card.' },
  { id: 'space_3', index: 3, name: 'Seed Capital Beta', type: 'property', group: 'Seed Stage', baseCost: 60, rentTiers: [8, 40, 100, 300, 450, 600] },
  { id: 'space_4', index: 4, name: 'Capital Gains Tax', type: 'penalty', baseCost: 150, description: 'Pay 150 ƁM in regulatory audit taxes.' },
  { id: 'space_5', index: 5, name: 'Metro Transit System', type: 'company', group: 'Transport', baseCost: 200, rentTiers: [25, 50, 100, 200] },
  { id: 'space_6', index: 6, name: 'Quantum Cyber Lab', type: 'property', group: 'Cyber & Quantum', baseCost: 100, rentTiers: [10, 50, 150, 450, 625, 750] },
  { id: 'space_7', index: 7, name: 'Strategy Hub Alpha', type: 'sp_station', description: 'Gain +25 Strategy Points (SP).' },
  { id: 'space_8', index: 8, name: 'Neural Net Research', type: 'property', group: 'Cyber & Quantum', baseCost: 100, rentTiers: [10, 50, 150, 450, 625, 750] },
  { id: 'space_9', index: 9, name: 'Cloud Fabric Core', type: 'property', group: 'Cyber & Quantum', baseCost: 120, rentTiers: [12, 60, 180, 500, 700, 900] },
  { id: 'space_10', index: 10, name: 'SEC Compliance Hold', type: 'rest', description: 'Routine regulatory review. Safe holding space.' },
  { id: 'space_11', index: 11, name: 'BioGen Therapeutics', type: 'property', group: 'BioTech', baseCost: 140, rentTiers: [14, 70, 200, 550, 750, 950] },
  { id: 'space_12', index: 12, name: 'CleanGrid Utility', type: 'company', group: 'Energy Utility', baseCost: 150, rentTiers: [20, 50, 100, 150] },
  { id: 'space_13', index: 13, name: 'GeneTech Diagnostics', type: 'property', group: 'BioTech', baseCost: 140, rentTiers: [14, 70, 200, 550, 750, 950] },
  { id: 'space_14', index: 14, name: 'ImmunoHealth Global', type: 'property', group: 'BioTech', baseCost: 160, rentTiers: [16, 80, 220, 600, 800, 1000] },
  { id: 'space_15', index: 15, name: 'Intermodal Logistics', type: 'company', group: 'Transport', baseCost: 200, rentTiers: [25, 50, 100, 200] },
  { id: 'space_16', index: 16, name: 'Solaris Renewables', type: 'property', group: 'CleanTech Energy', baseCost: 180, rentTiers: [18, 90, 250, 700, 875, 1050] },
  { id: 'space_17', index: 17, name: 'Venture Syndicate', type: 'market_event', description: 'Draw a dynamic Market Event card.' },
  { id: 'space_18', index: 18, name: 'Fusion Dynamics', type: 'property', group: 'CleanTech Energy', baseCost: 180, rentTiers: [18, 90, 250, 700, 875, 1050] },
  { id: 'space_19', index: 19, name: 'Apex Power Grid', type: 'property', group: 'CleanTech Energy', baseCost: 200, rentTiers: [20, 100, 300, 750, 925, 1100] },
  { id: 'space_20', index: 20, name: 'Liquidity Reserve', type: 'rest', description: 'Safe harbor capital reserve.' },
  { id: 'space_21', index: 21, name: 'PayStream Platform', type: 'property', group: 'Fintech', baseCost: 220, rentTiers: [22, 110, 330, 800, 975, 1150] },
  { id: 'space_22', index: 22, name: 'High-Frequency Auction', type: 'auction', description: 'Immediate live asset auction!' },
  { id: 'space_23', index: 23, name: 'LedgerVault Security', type: 'property', group: 'Fintech', baseCost: 220, rentTiers: [22, 110, 330, 800, 975, 1150] },
  { id: 'space_24', index: 24, name: 'StripeLine Payments', type: 'property', group: 'Fintech', baseCost: 240, rentTiers: [24, 120, 360, 850, 1025, 1200] },
  { id: 'space_25', index: 25, name: 'HyperLoop Express', type: 'company', group: 'Transport', baseCost: 200, rentTiers: [25, 50, 100, 200] },
  { id: 'space_26', index: 26, name: 'Tensor Data Core', type: 'property', group: 'Artificial Intelligence', baseCost: 260, rentTiers: [26, 130, 390, 900, 1100, 1275] },
  { id: 'space_27', index: 27, name: 'Strategy Hub Beta', type: 'sp_station', description: 'Gain +30 Strategy Points (SP).' },
  { id: 'space_28', index: 28, name: 'Synthetix Cognitive', type: 'property', group: 'Artificial Intelligence', baseCost: 260, rentTiers: [26, 130, 390, 900, 1100, 1275] },
  { id: 'space_29', index: 29, name: 'Omni Intelligence HQ', type: 'property', group: 'Artificial Intelligence', baseCost: 280, rentTiers: [28, 150, 450, 1000, 1200, 1400] },
  { id: 'space_30', index: 30, name: 'Market Volatility Fee', type: 'penalty', baseCost: 100, description: 'Market volatility surcharge. Pay 100 ƁM.' },
  { id: 'space_31', index: 31, name: 'Titan Conglomerate', type: 'property', group: 'Global Titans', baseCost: 300, rentTiers: [30, 160, 480, 1050, 1300, 1500] },
  { id: 'space_32', index: 32, name: 'AeroSpace Prime', type: 'property', group: 'Global Titans', baseCost: 300, rentTiers: [30, 160, 480, 1050, 1300, 1500] },
  { id: 'space_33', index: 33, name: 'Central Bank Directive', type: 'market_event', description: 'Draw a dynamic Market Event card.' },
  { id: 'space_34', index: 34, name: 'Quantum Dynamics Corp', type: 'property', group: 'Global Titans', baseCost: 320, rentTiers: [32, 175, 500, 1100, 1350, 1600] },
  { id: 'space_35', index: 35, name: 'Orbital Constellation', type: 'company', group: 'Transport', baseCost: 200, rentTiers: [25, 50, 100, 200] },
  { id: 'space_36', index: 36, name: 'Venture Capital Board', type: 'sp_station', description: 'Gain +35 Strategy Points (SP).' },
  { id: 'space_37', index: 37, name: 'Wall Street Citadel', type: 'property', group: 'Wall Street Apex', baseCost: 350, rentTiers: [35, 175, 500, 1100, 1300, 1500] },
  { id: 'space_38', index: 38, name: 'Super-Wealth Assessment', type: 'penalty', baseCost: 100, description: 'Super-wealth regulatory assessment. Pay 100 ƁM.' },
  { id: 'space_39', index: 39, name: 'Mayfair Financial Tower', type: 'property', group: 'Wall Street Apex', baseCost: 400, rentTiers: [50, 200, 600, 1400, 1700, 2000] },
  { id: 'space_40', index: 40, name: 'Silicon Valley Incubator', type: 'property', group: 'Seed Stage', baseCost: 80, rentTiers: [10, 50, 150, 450, 600, 800] },
  { id: 'space_41', index: 41, name: 'Private Equity Fund', type: 'market_event', description: 'Draw a dynamic Market Event card.' },
  { id: 'space_42', index: 42, name: 'CyberShield Systems', type: 'property', group: 'Cyber & Quantum', baseCost: 120, rentTiers: [12, 60, 180, 500, 700, 900] },
  { id: 'space_43', index: 43, name: 'Strategy Hub Gamma', type: 'sp_station', description: 'Gain +40 Strategy Points (SP).' },
  { id: 'space_44', index: 44, name: 'NeuroLink Technologies', type: 'property', group: 'BioTech', baseCost: 160, rentTiers: [16, 80, 220, 600, 800, 1000] },
  { id: 'space_45', index: 45, name: 'Global Shipping Fleet', type: 'company', group: 'Transport', baseCost: 200, rentTiers: [25, 50, 100, 200] },
  { id: 'space_46', index: 46, name: 'WindFarm Dynamics', type: 'property', group: 'CleanTech Energy', baseCost: 200, rentTiers: [20, 100, 300, 750, 925, 1100] },
  { id: 'space_47', index: 47, name: 'DeFi Liquidity Pool', type: 'property', group: 'Fintech', baseCost: 240, rentTiers: [24, 120, 360, 850, 1025, 1200] },
  { id: 'space_48', index: 48, name: 'High-Frequency Auction 2', type: 'auction', description: 'Immediate live asset auction!' },
  { id: 'space_49', index: 49, name: 'Sentient AI Labs', type: 'property', group: 'Artificial Intelligence', baseCost: 280, rentTiers: [28, 150, 450, 1000, 1200, 1400] },
  { id: 'space_50', index: 50, name: 'MegaCorp Holdings', type: 'property', group: 'Global Titans', baseCost: 320, rentTiers: [32, 175, 500, 1100, 1350, 1600] },
  { id: 'space_51', index: 51, name: 'Hedge Fund Citadel', type: 'property', group: 'Wall Street Apex', baseCost: 400, rentTiers: [50, 200, 600, 1400, 1700, 2000] },
];

const DEFAULT_MARKET_EVENTS = [
  {
    code: 'TECH_BOOM',
    name: 'Artificial Intelligence Boom',
    description: 'Breakthrough AI models drive corporate valuations. AI and Tech properties yield +50% rent.',
    scope: 'sector',
    defaultDurationRounds: 3,
    rentMultiplier: 1.5,
    probabilityWeight: 25,
  },
  {
    code: 'BULL_MARKET',
    name: 'Global Bull Market',
    description: 'Euphoric market sentiment boosts investor revenues across all asset sectors by +25%.',
    scope: 'global',
    defaultDurationRounds: 3,
    rentMultiplier: 1.25,
    probabilityWeight: 25,
  },
  {
    code: 'BEAR_MARKET',
    name: 'Market Correction',
    description: 'Credit tightening contracts corporate earnings. Base rent across all sectors drops by 20%.',
    scope: 'global',
    defaultDurationRounds: 2,
    rentMultiplier: 0.8,
    probabilityWeight: 20,
  },
  {
    code: 'ENERGY_SURGE',
    name: 'Clean Energy Demand Spike',
    description: 'Green transition mandate doubles utility and clean tech dividends and rent.',
    scope: 'sector',
    defaultDurationRounds: 3,
    rentMultiplier: 2.0,
    probabilityWeight: 15,
  },
  {
    code: 'BIOTECH_BREAKTHROUGH',
    name: 'Clinical Trial Approval',
    description: 'FDA clears next-gen therapy, doubling Biotech property revenues.',
    scope: 'sector',
    defaultDurationRounds: 3,
    rentMultiplier: 2.0,
    probabilityWeight: 15,
  },
];

const DEFAULT_SP_ACTIONS = [
  {
    id: 'sp_liquidity_injection',
    code: 'LIQUIDITY_INJECTION',
    name: 'Strategic Liquidity Injection',
    description: 'Convert 25 Strategy Points (SP) into 75 ƁM emergency working capital cash infusion directly into corporate treasury.',
    category: 'utility',
    spCost: 25,
    cooldownTurns: 1,
    requiresTarget: false,
    actionHandlerKey: 'strategic_liquidity',
  },
  {
    id: 'sp_market_scan',
    code: 'MARKET_SCAN',
    name: 'Syndicate Market Intelligence',
    description: 'Deploy 35 Strategy Points (SP) to analyze indicators and activate yield multiplier perks across all corporate holdings.',
    category: 'investment',
    spCost: 35,
    cooldownTurns: 2,
    requiresTarget: false,
    actionHandlerKey: 'market_intelligence',
  },
  {
    id: 'sp_regulatory_shield',
    code: 'REGULATORY_SHIELD',
    name: 'Regulatory Harbor Shield',
    description: 'Deploy 30 Strategy Points (SP) into legal contingency reserves, shielding your corporation against regulatory penalties.',
    category: 'defensive',
    spCost: 30,
    cooldownTurns: 2,
    requiresTarget: false,
    actionHandlerKey: 'regulatory_shield',
  },
  {
    id: 'sp_hostile_takeover',
    code: 'HOSTILE_TAKEOVER_LEVERAGE',
    name: 'Hostile Leverage Surcharge',
    description: 'Spend 50 Strategy Points (SP) to trigger an emergency hostile takeover auction on an opponent unmortgaged property.',
    category: 'offensive',
    spCost: 50,
    cooldownTurns: 4,
    requiresTarget: true,
    actionHandlerKey: 'hostile_takeover',
  },
];

const DEFAULT_DICE_SKINS = [
  {
    id: 'obsidian-gold',
    name: 'Obsidian & Gold',
    tagline: 'High-Roller Volcanic Elegance',
    badgeIcon: '🌋',
    rarity: 'Legendary',
    rarityColor: '#f59e0b',
    accentColor: '#fbbf24',
    pedestalColor: '#b45309',
    glowColor: '#f59e0b',
    unlockedByDefault: true,
    unlockRequirement: 'Standard High-Roller Reward (Unlocked)',
  },
  {
    id: 'neon-cyberpunk',
    name: 'Neon Cyberpunk',
    tagline: 'Quantum Carbon & LED Phosphors',
    badgeIcon: '⚡',
    rarity: 'Mythic',
    rarityColor: '#06b6d4',
    accentColor: '#22d3ee',
    pedestalColor: '#0891b2',
    glowColor: '#00f0ff',
    unlockedByDefault: false,
    unlockRequirement: 'Reach ƁM 150,000 Net Worth or Win 1 Match',
  },
  {
    id: 'crystal-ruby',
    name: 'Crystal Ruby',
    tagline: 'Vegas Casino Candy Refraction',
    badgeIcon: '💎',
    rarity: 'Epic',
    rarityColor: '#f43f5e',
    accentColor: '#fb7185',
    pedestalColor: '#be123c',
    glowColor: '#f43f5e',
    unlockedByDefault: false,
    unlockRequirement: 'Acquire 3 High-Yield Properties in a Single Game',
  },
  {
    id: 'ivory',
    name: 'Royal Ivory',
    tagline: 'Monaco Aristocrat Classical Edition',
    badgeIcon: '🏛️',
    rarity: 'Rare',
    rarityColor: '#10b981',
    accentColor: '#34d399',
    pedestalColor: '#047857',
    glowColor: '#10b981',
    unlockedByDefault: true,
    unlockRequirement: 'Standard Investor Issue (Unlocked)',
  },
  {
    id: 'emerald-vip',
    name: 'Emerald VIP',
    tagline: 'Imperial Jade & Gold Medallion',
    badgeIcon: '👑',
    rarity: 'Legendary',
    rarityColor: '#10b981',
    accentColor: '#6ee7b7',
    pedestalColor: '#065f46',
    glowColor: '#10b981',
    unlockedByDefault: false,
    unlockRequirement: 'Execute 5 Corporate Restructuring / Mortgage Pledges',
  },
];

async function seedAll() {
  const token = await getAccessToken();
  const now = Date.now();
  console.log('Got IAM Token. Seeding configurations into Firestore...');

  // 1. ruleset_standard
  await writeDoc(token, 'ruleset_standard', {
    configId: 'ruleset_standard',
    configType: 'ruleset',
    version: '1.0.0',
    active: true,
    updatedAt: now,
    rulesetVersion: '1.0.0',
    name: 'Standard Investor Wars Ruleset',
    maxPlayers: 6,
    minPlayers: 2,
    turnTimeoutSeconds: 60,
    startingCash: 1500,
    startingSP: 100,
    passGoSalary: 200,
    bankruptcyThreshold: 0,
    maxAuctionDurationSeconds: 45,
    enableAuctions: true,
    enableMarketEvents: true,
    enableSPActions: true,
    enableCompanyShares: true,
  });
  console.log('✓ ruleset_standard seeded');

  // 2. board_standard
  await writeDoc(token, 'board_standard', {
    configId: 'board_standard',
    configType: 'board',
    version: '1.0.0',
    active: true,
    updatedAt: now,
    boardId: 'board_standard',
    name: "BIG MOMMA: INVESTORS' WAR Financial District",
    totalSpaces: 52,
    spaces: DEFAULT_STANDARD_SPACES,
  });
  console.log('✓ board_standard seeded');

  // 3. market_events_standard
  await writeDoc(token, 'market_events_standard', {
    configId: 'market_events_standard',
    configType: 'market_events',
    version: '1.0.0',
    active: true,
    updatedAt: now,
    catalogId: 'market_events_standard',
    events: DEFAULT_MARKET_EVENTS,
  });
  console.log('✓ market_events_standard seeded');

  // 4. sp_actions_standard
  await writeDoc(token, 'sp_actions_standard', {
    configId: 'sp_actions_standard',
    configType: 'sp_actions',
    version: '1.0.0',
    active: true,
    updatedAt: now,
    catalogId: 'sp_actions_standard',
    actions: DEFAULT_SP_ACTIONS,
  });
  console.log('✓ sp_actions_standard seeded');

  // 5. asset_tier_rules_standard
  await writeDoc(token, 'asset_tier_rules_standard', {
    configId: 'asset_tier_rules_standard',
    configType: 'system',
    version: '1.0.0',
    active: true,
    updatedAt: now,
    mortgageRatio: 0.5,
    unmortgageInterestRatio: 0.1,
    maxDevelopmentLevel: 5,
  });
  console.log('✓ asset_tier_rules_standard seeded');

  // 6. cosmetics_dice_skins
  await writeDoc(token, 'cosmetics_dice_skins', {
    configId: 'cosmetics_dice_skins',
    configType: 'system',
    version: '1.0.0',
    active: true,
    updatedAt: now,
    catalogId: 'cosmetics_dice_skins',
    skins: DEFAULT_DICE_SKINS,
  });
  console.log('✓ cosmetics_dice_skins seeded');

  console.log('All 6 configurations successfully seeded into Firestore!');
  process.exit(0);
}

seedAll().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
