/**
 * Server-Side Authoritative Board Data & Spaces Definitions
 */

export interface ServerBoardSpace {
  id: string;
  index: number;
  name: string;
  type: 'start' | 'property' | 'company' | 'market_event' | 'sp_station' | 'penalty' | 'auction' | 'rest';
  group?: string;
  baseCost?: number;
  baseRent?: number;
  rentTiers?: number[];
  description?: string;
}

export const SERVER_STANDARD_SPACES: ServerBoardSpace[] = [
  { id: 'space_0', index: 0, name: 'START / GO', type: 'start', description: 'Collect 200 ƁM salary when passing or landing.' },
  { id: 'space_1', index: 1, name: 'Seed Capital Alpha', type: 'property', group: 'Seed Stage', baseCost: 60, baseRent: 6, rentTiers: [6, 30, 90, 270, 400, 550] },
  { id: 'space_2', index: 2, name: 'Angel Syndicate', type: 'market_event', description: 'Draw a dynamic Market Event card.' },
  { id: 'space_3', index: 3, name: 'Seed Capital Beta', type: 'property', group: 'Seed Stage', baseCost: 60, baseRent: 8, rentTiers: [8, 40, 100, 300, 450, 600] },
  { id: 'space_4', index: 4, name: 'Capital Gains Tax', type: 'penalty', baseCost: 150, description: 'Pay 150 ƁM in regulatory audit taxes.' },
  { id: 'space_5', index: 5, name: 'Metro Transit System', type: 'company', group: 'Transport', baseCost: 200, baseRent: 25, rentTiers: [25, 50, 100, 200] },
  { id: 'space_6', index: 6, name: 'Quantum Cyber Lab', type: 'property', group: 'Cyber & Quantum', baseCost: 100, baseRent: 10, rentTiers: [10, 50, 150, 450, 625, 750] },
  { id: 'space_7', index: 7, name: 'Strategy Hub Alpha', type: 'sp_station', description: 'Gain +25 Strategy Points (SP).' },
  { id: 'space_8', index: 8, name: 'Neural Net Research', type: 'property', group: 'Cyber & Quantum', baseCost: 100, baseRent: 10, rentTiers: [10, 50, 150, 450, 625, 750] },
  { id: 'space_9', index: 9, name: 'Cloud Fabric Core', type: 'property', group: 'Cyber & Quantum', baseCost: 120, baseRent: 12, rentTiers: [12, 60, 180, 500, 700, 900] },
  { id: 'space_10', index: 10, name: 'SEC Compliance Hold', type: 'rest', description: 'Routine regulatory review. Safe holding space.' },
  { id: 'space_11', index: 11, name: 'BioGen Therapeutics', type: 'property', group: 'BioTech', baseCost: 140, baseRent: 14, rentTiers: [14, 70, 200, 550, 750, 950] },
  { id: 'space_12', index: 12, name: 'CleanGrid Utility', type: 'company', group: 'Energy Utility', baseCost: 150, baseRent: 20, rentTiers: [20, 50, 100, 150] },
  { id: 'space_13', index: 13, name: 'GeneTech Diagnostics', type: 'property', group: 'BioTech', baseCost: 140, baseRent: 14, rentTiers: [14, 70, 200, 550, 750, 950] },
  { id: 'space_14', index: 14, name: 'ImmunoHealth Global', type: 'property', group: 'BioTech', baseCost: 160, baseRent: 16, rentTiers: [16, 80, 220, 600, 800, 1000] },
  { id: 'space_15', index: 15, name: 'Intermodal Logistics', type: 'company', group: 'Transport', baseCost: 200, baseRent: 25, rentTiers: [25, 50, 100, 200] },
  { id: 'space_16', index: 16, name: 'Solaris Renewables', type: 'property', group: 'CleanTech Energy', baseCost: 180, baseRent: 18, rentTiers: [18, 90, 250, 700, 875, 1050] },
  { id: 'space_17', index: 17, name: 'Venture Syndicate', type: 'market_event', description: 'Draw a dynamic Market Event card.' },
  { id: 'space_18', index: 18, name: 'Fusion Dynamics', type: 'property', group: 'CleanTech Energy', baseCost: 180, baseRent: 18, rentTiers: [18, 90, 250, 700, 875, 1050] },
  { id: 'space_19', index: 19, name: 'Apex Power Grid', type: 'property', group: 'CleanTech Energy', baseCost: 200, baseRent: 20, rentTiers: [20, 100, 300, 750, 925, 1100] },
  { id: 'space_20', index: 20, name: 'Liquidity Reserve', type: 'rest', description: 'Safe harbor capital reserve.' },
  { id: 'space_21', index: 21, name: 'PayStream Platform', type: 'property', group: 'Fintech', baseCost: 220, baseRent: 22, rentTiers: [22, 110, 330, 800, 975, 1150] },
  { id: 'space_22', index: 22, name: 'High-Frequency Auction', type: 'auction', description: 'Immediate live asset auction!' },
  { id: 'space_23', index: 23, name: 'LedgerVault Security', type: 'property', group: 'Fintech', baseCost: 220, baseRent: 22, rentTiers: [22, 110, 330, 800, 975, 1150] },
  { id: 'space_24', index: 24, name: 'StripeLine Payments', type: 'property', group: 'Fintech', baseCost: 240, baseRent: 24, rentTiers: [24, 120, 360, 850, 1025, 1200] },
  { id: 'space_25', index: 25, name: 'HyperLoop Express', type: 'company', group: 'Transport', baseCost: 200, baseRent: 25, rentTiers: [25, 50, 100, 200] },
  { id: 'space_26', index: 26, name: 'Tensor Data Core', type: 'property', group: 'Artificial Intelligence', baseCost: 260, baseRent: 26, rentTiers: [26, 130, 390, 900, 1100, 1275] },
  { id: 'space_27', index: 27, name: 'Strategy Hub Beta', type: 'sp_station', description: 'Gain +30 Strategy Points (SP).' },
  { id: 'space_28', index: 28, name: 'Synthetix Cognitive', type: 'property', group: 'Artificial Intelligence', baseCost: 260, baseRent: 26, rentTiers: [26, 130, 390, 900, 1100, 1275] },
  { id: 'space_29', index: 29, name: 'Omni Intelligence HQ', type: 'property', group: 'Artificial Intelligence', baseCost: 280, baseRent: 28, rentTiers: [28, 150, 450, 1000, 1200, 1400] },
  { id: 'space_30', index: 30, name: 'Market Volatility Fee', type: 'penalty', baseCost: 100, description: 'Market volatility surcharge. Pay 100 ƁM.' },
  { id: 'space_31', index: 31, name: 'Titan Conglomerate', type: 'property', group: 'Global Titans', baseCost: 300, baseRent: 30, rentTiers: [30, 160, 480, 1050, 1300, 1500] },
  { id: 'space_32', index: 32, name: 'AeroSpace Prime', type: 'property', group: 'Global Titans', baseCost: 300, baseRent: 30, rentTiers: [30, 160, 480, 1050, 1300, 1500] },
  { id: 'space_33', index: 33, name: 'Central Bank Directive', type: 'market_event', description: 'Draw a dynamic Market Event card.' },
  { id: 'space_34', index: 34, name: 'Quantum Dynamics Corp', type: 'property', group: 'Global Titans', baseCost: 320, baseRent: 32, rentTiers: [32, 175, 500, 1100, 1350, 1600] },
  { id: 'space_35', index: 35, name: 'Orbital Constellation', type: 'company', group: 'Transport', baseCost: 200, baseRent: 25, rentTiers: [25, 50, 100, 200] },
  { id: 'space_36', index: 36, name: 'Venture Capital Board', type: 'sp_station', description: 'Gain +35 Strategy Points (SP).' },
  { id: 'space_37', index: 37, name: 'Wall Street Citadel', type: 'property', group: 'Wall Street Apex', baseCost: 350, baseRent: 35, rentTiers: [35, 175, 500, 1100, 1300, 1500] },
  { id: 'space_38', index: 38, name: 'Super-Wealth Assessment', type: 'penalty', baseCost: 100, description: 'Super-wealth regulatory assessment. Pay 100 ƁM.' },
  { id: 'space_39', index: 39, name: 'Mayfair Financial Tower', type: 'property', group: 'Wall Street Apex', baseCost: 400, baseRent: 50, rentTiers: [50, 200, 600, 1400, 1700, 2000] },
  { id: 'space_40', index: 40, name: 'Silicon Valley Incubator', type: 'property', group: 'Seed Stage', baseCost: 80, baseRent: 10, rentTiers: [10, 50, 150, 450, 600, 800] },
  { id: 'space_41', index: 41, name: 'Private Equity Fund', type: 'market_event', description: 'Draw a dynamic Market Event card.' },
  { id: 'space_42', index: 42, name: 'CyberShield Systems', type: 'property', group: 'Cyber & Quantum', baseCost: 120, baseRent: 12, rentTiers: [12, 60, 180, 500, 700, 900] },
  { id: 'space_43', index: 43, name: 'Strategy Hub Gamma', type: 'sp_station', description: 'Gain +40 Strategy Points (SP).' },
  { id: 'space_44', index: 44, name: 'NeuroLink Technologies', type: 'property', group: 'BioTech', baseCost: 160, baseRent: 16, rentTiers: [16, 80, 220, 600, 800, 1000] },
  { id: 'space_45', index: 45, name: 'Global Shipping Fleet', type: 'company', group: 'Transport', baseCost: 200, baseRent: 25, rentTiers: [25, 50, 100, 200] },
  { id: 'space_46', index: 46, name: 'WindFarm Dynamics', type: 'property', group: 'CleanTech Energy', baseCost: 200, baseRent: 20, rentTiers: [20, 100, 300, 750, 925, 1100] },
  { id: 'space_47', index: 47, name: 'DeFi Liquidity Pool', type: 'property', group: 'Fintech', baseCost: 240, baseRent: 24, rentTiers: [24, 120, 360, 850, 1025, 1200] },
  { id: 'space_48', index: 48, name: 'High-Frequency Auction 2', type: 'auction', description: 'Immediate live asset auction!' },
  { id: 'space_49', index: 49, name: 'Sentient AI Labs', type: 'property', group: 'Artificial Intelligence', baseCost: 280, baseRent: 28, rentTiers: [28, 150, 450, 1000, 1200, 1400] },
  { id: 'space_50', index: 50, name: 'MegaCorp Holdings', type: 'property', group: 'Global Titans', baseCost: 320, baseRent: 32, rentTiers: [32, 175, 500, 1100, 1350, 1600] },
  { id: 'space_51', index: 51, name: 'Hedge Fund Citadel', type: 'property', group: 'Wall Street Apex', baseCost: 400, baseRent: 50, rentTiers: [50, 200, 600, 1400, 1700, 2000] },
];

export const TOTAL_BOARD_SPACES = 52;

export function getServerSpace(index: number): ServerBoardSpace {
  const normIndex = ((index % TOTAL_BOARD_SPACES) + TOTAL_BOARD_SPACES) % TOTAL_BOARD_SPACES;
  return SERVER_STANDARD_SPACES[normIndex];
}
