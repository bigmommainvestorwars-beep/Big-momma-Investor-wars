import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
  MapPin,
  Flame,
  Zap,
} from 'lucide-react';
import { configRepository, ConfigurationDocument } from '../../../services/firestore/configRepository';

export const ConfigurationInspector: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigurationDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>('ruleset_standard');
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const loadConfigurations = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await configRepository.getAllConfigurations();
      setConfigs(items);
      setLastRefreshed(Date.now());
    } catch (err: any) {
      console.error('Failed to load configurations:', err);
      setError(err?.message || 'Failed to fetch Firestore configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigurations();
  }, []);

  const getConfigIcon = (type: string) => {
    switch (type) {
      case 'ruleset':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'board':
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'market_events':
        return <Flame className="w-4 h-4 text-amber-600" />;
      case 'sp_actions':
        return <Zap className="w-4 h-4 text-purple-600" />;
      case 'system':
        return <Sparkles className="w-4 h-4 text-cyan-600" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Authoritative System Configurations (/configurations)
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {configs.length} Active Docs
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400">
            Updated: {new Date(lastRefreshed).toLocaleTimeString()}
          </span>
          <button
            onClick={loadConfigurations}
            disabled={loading}
            className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {loading && configs.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs font-mono">Querying Firestore /configurations catalog...</span>
          </div>
        ) : configs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 font-mono">
            No configuration documents found in the database.
          </div>
        ) : (
          <div className="space-y-2">
            {configs.map((config) => {
              const isExpanded = expandedId === config.configId;
              return (
                <div
                  key={config.configId}
                  className="border border-slate-200 rounded-lg overflow-hidden transition-all bg-white"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : config.configId)}
                    className="p-3 bg-slate-50/50 hover:bg-slate-100/60 cursor-pointer flex items-center justify-between transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                        {getConfigIcon(config.configType)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{config.configId}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            v{config.version || '1.0.0'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase">
                          Type: {config.configType}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Synchronized
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 border-t border-slate-200 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-72">
                      <pre className="text-slate-300">
                        {JSON.stringify(config, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
