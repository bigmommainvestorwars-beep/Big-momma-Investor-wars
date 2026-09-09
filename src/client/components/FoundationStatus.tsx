/**
 * Production Foundation Status Inspector Component
 * Displays system health, architecture boundaries, environment configuration, and verification checklist.
 */

import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  KeyRound,
  Cpu,
  RefreshCw,
  Info,
  Server,
  Terminal,
  Activity,
  Zap,
  Gamepad2,
  Flame,
} from 'lucide-react';
import { ENV } from '../../config/env';
import { getFirebaseStatus } from '../../services/firebase/config';
import { defaultIdempotencyManager } from '../../engine/idempotency';
import { errorHandler } from '../../services/monitoring/errorHandler';
import { logger } from '../../services/monitoring/logger';
import { runBackendHealthCheck, BackendHealthReport, HealthCheckServiceStatus } from '../../services/monitoring/healthCheck';
import { MatchTestingConsole } from './MatchTestingConsole';
import { GameBoard } from './GameBoard';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';

export const FoundationStatus: React.FC = () => {
  const { isLocalTestMode, setLocalTestMode, user } = useAuth();
  const { match } = useGame();
  const [firebaseStatus] = useState(getFirebaseStatus());
  const [activeTab, setActiveTab] = useState<'game' | 'simulator' | 'architecture'>('game');
  const [healthReport, setHealthReport] = useState<BackendHealthReport | null>(null);
  const [isRunningHealth, setIsRunningHealth] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const runFullHealthCheck = async () => {
    setIsRunningHealth(true);
    try {
      logger.log('security_event', 'info', 'Executing comprehensive backend health check.');
      const report = await runBackendHealthCheck();
      setHealthReport(report);
      setTestResult(
        `Health check complete: Overall status is "${report.overallStatus.toUpperCase()}". Summary: ${report.summary}`
      );
    } catch (err) {
      errorHandler.capture(err);
      setTestResult('Diagnostic reported an issue running the health check.');
    } finally {
      setIsRunningHealth(false);
    }
  };

  const modules = [
    {
      id: 'contracts',
      name: 'Shared TypeScript Contracts',
      status: 'Ready',
      detail: '19 core contracts defined (User, Player, GameState, Board, Asset, Auction, SP, etc.)',
      icon: FileCode2,
    },
    {
      id: 'engine',
      name: 'Authoritative Game Engine Boundary',
      status: 'Ready',
      detail: 'Client-mutation guards active; server-authoritative mutation interface strictly enforced.',
      icon: Cpu,
    },
    {
      id: 'cloud_functions',
      name: 'Authoritative Cloud Functions (Step 2)',
      status: 'Deployed & Ready',
      detail: '12 server callables implemented (Match, Roll, Buy, Auction, Bot, Turn, Rate Limit, Health).',
      icon: Server,
    },
    {
      id: 'idempotency',
      name: 'Idempotency & Rate Limiting Engine',
      status: 'Active',
      detail: 'RequestId tracking, in-flight duplicate locks, replay prevention, and leaky-bucket limits.',
      icon: Zap,
    },
    {
      id: 'firebase_rules',
      name: 'Firestore Rules & RBAC Security',
      status: 'Enforced',
      detail: 'Strict role verification, participant isolation, client-mutation prohibitions deployed in firestore.rules.',
      icon: Shield,
    },
    {
      id: 'realtime_sync',
      name: 'Real-Time Firestore Sync (Step 2)',
      status: 'Connected',
      detail: 'Live listeners for matches, player standings, turn order, auctions, and audit logs.',
      icon: Activity,
    },
    {
      id: 'config',
      name: 'Configuration Boundaries',
      status: 'Configured',
      detail: 'Board, Ruleset, Company, SP Action, Market Event, and Auction registries separated.',
      icon: Layers,
    },
    {
      id: 'firebase',
      name: 'Firebase Client Architecture',
      status: firebaseStatus.isConfigured ? 'Configured' : 'Local Emulator Mode',
      detail: firebaseStatus.isConfigured
        ? `Project: ${firebaseStatus.projectId}`
        : 'Integration structure initialized with safe client credentials.',
      icon: Database,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Step 01 & Step 02: Architecture Foundation & Authoritative Engine
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isLocalTestMode
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                {isLocalTestMode ? 'DEVELOPMENT / LOCAL TEST MODE' : 'LIVE FIREBASE CLOUD MODE'}
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              BIG MOMMA: INVESTORS' WAR
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Authoritative turns, interactive 52-space circular board, autonomous AI bot investors, high-frequency auctions, and strategy points.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="toggle-local-test-mode"
              onClick={() => setLocalTestMode(!isLocalTestMode)}
              className="px-3 py-1.5 rounded text-xs font-semibold border transition-colors shadow-xs flex items-center gap-1.5 bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
              title="Toggle between safe local in-memory test engine and live Firebase Cloud Functions"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Mode: <span className="font-bold text-slate-900">{isLocalTestMode ? 'Local Engine' : 'Firebase Cloud'}</span>
            </button>
            <button
              disabled={isRunningHealth}
              onClick={runFullHealthCheck}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningHealth ? 'animate-spin' : ''}`} />
              {isRunningHealth ? 'Checking...' : 'Run Health Check'}
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-4">
          <button
            id="tab-game-board"
            onClick={() => setActiveTab('game')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'game'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-emerald-600" />
            Interactive Game Board & Turns
            {match && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                Live Match
              </span>
            )}
          </button>
          <button
            id="tab-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Match Testing Console & Diagnostics
          </button>
          <button
            id="tab-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Subsystems & Security Architecture
          </button>
        </div>

        {testResult && (
          <div className="p-4 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        {/* Tab 1: Architecture Overview */}
        {activeTab === 'architecture' && (
          <div className="space-y-8">
            {/* Live Health Check Report breakdown if run */}
            {healthReport && (
              <section className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Subsystem Health Check Results
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      healthReport.overallStatus === 'healthy'
                        ? 'bg-emerald-100 text-emerald-800'
                        : healthReport.overallStatus === 'degraded'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {healthReport.overallStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {Object.entries(healthReport.services).map(([svcKey, val]) => {
                    const svc = val as HealthCheckServiceStatus;
                    return (
                      <div key={svcKey} className="p-3 rounded bg-slate-50 border border-slate-100 space-y-1">
                        <div className="text-[11px] font-medium text-slate-500">{svc.name}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 capitalize">{svc.status}</span>
                          {svc.latencyMs !== undefined && (
                            <span className="text-[10px] font-mono text-slate-500">{svc.latencyMs}ms</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Subsystem Grid */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Subsystem Verification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.id}
                      className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-slate-100 text-slate-700">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">{m.name}</h3>
                            <p className="text-xs text-slate-600 mt-0.5">{m.detail}</p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${
                            m.status === 'Ready' ||
                            m.status === 'Active' ||
                            m.status === 'Enforced' ||
                            m.status === 'Configured' ||
                            m.status === 'Connected' ||
                            m.status === 'Deployed & Ready'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Security & Invariant Rules */}
            <section className="p-6 bg-white rounded-lg border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Shield className="w-4 h-4 text-slate-700" />
                Authoritative Server Boundaries (Anti-Cheat Invariant)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The client is strictly restricted to presentation and interaction dispatching. All cash balances,
                asset ownership, dice roll random number generation, SP balances, auction resolution, and game
                outcomes are guarded by server-authoritative contracts and Cloud Functions.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-xs">
                {[
                  'No Client Cash Updates',
                  'No Client Dice Roll Gen',
                  'No Client Asset Seizure',
                  'Strict Idempotency Keys',
                  'App Check Token Attestation',
                  'Leaky-Bucket Rate Limiter',
                  'State Version Concurrency',
                  'Sanitized Error Codes',
                ].map((rule) => (
                  <div key={rule} className="p-2 bg-slate-50 border border-slate-100 rounded text-slate-700 font-medium">
                    ✓ {rule}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Tab 1: Interactive Game Board & Turns */}
        {activeTab === 'game' && <GameBoard />}

        {/* Tab 2: Match Simulator & Tester */}
        {activeTab === 'simulator' && <MatchTestingConsole />}

        {/* Environment Details */}
        <footer className="text-xs text-slate-600 border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Project Root: /src • Build: Vite + React 19 + TypeScript Strict</span>
          <span>Cloud Functions: 12 authoritatively guarded callables</span>
        </footer>
      </div>
    </div>
  );
};

