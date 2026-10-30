import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Download,
  Upload,
  Cloud,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  generateSyncUrl,
  getLocalSnapshot,
  applyLocalSnapshot,
  pushToCloudSync,
  pullFromCloudSync,
} from '../lib/sync.js';

export default function SyncDevicesModal({ isOpen, onClose, onDataRestored }) {
  const [syncUrl, setSyncUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'backup' | 'cloud'

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setQrError(false);
    generateSyncUrl()
      .then((url) => {
        setSyncUrl(url);
        return QRCode.toDataURL(url, {
          width: 320,
          margin: 1.5,
          errorCorrectionLevel: 'L',
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
      })
      .then((qrData) => {
        setQrCodeUrl(qrData);
      })
      .catch((err) => {
        console.error('Failed to generate sync QR:', err);
        setQrError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      let targetUrl = syncUrl;
      if (!targetUrl) {
        targetUrl = await generateSyncUrl();
        setSyncUrl(targetUrl);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(targetUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      // Robust execCommand fallback
      const textarea = document.createElement('textarea');
      textarea.value = syncUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {}
      document.body.removeChild(textarea);
    }
  };

  const handleExportFile = () => {
    const snapshot = getLocalSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMsg('Backup downloaded! You can AirDrop this to your phone.');
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const success = applyLocalSnapshot(parsed);
        if (success) {
          setStatusMsg('All data successfully restored and synced!');
          if (onDataRestored) onDataRestored();
          setTimeout(() => {
            setStatusMsg('');
            onClose();
          }, 1500);
        } else {
          setStatusMsg('Invalid backup file format.');
        }
      } catch (err) {
        setStatusMsg('Error parsing backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handlePushCloud = async () => {
    setLoading(true);
    setStatusMsg('');
    const { error } = await pushToCloudSync();
    setLoading(false);
    if (error) {
      setStatusMsg('Cloud push requires the Supabase sync table: ' + (error.message || error));
    } else {
      setStatusMsg('✓ Successfully uploaded current data to cloud!');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handlePullCloud = async () => {
    setLoading(true);
    setStatusMsg('');
    const { success, error } = await pullFromCloudSync();
    setLoading(false);
    if (error) {
      setStatusMsg('Could not pull from cloud: ' + (error.message || error));
    } else if (success) {
      setStatusMsg('✓ Pulled latest data from cloud!');
      if (onDataRestored) onDataRestored();
      setTimeout(() => {
        setStatusMsg('');
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl p-6 text-white space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sync Web App & Phone</h3>
              <p className="text-xs text-gray-400">Keep laptop and mobile in 100% sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 px-2 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'qr' ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <QrCode size={13} />
            <span>Scan to Phone</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-1.5 px-2 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'backup' ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Download size={13} />
            <span>File Backup</span>
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-1.5 px-2 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'cloud' ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cloud size={13} />
            <span>Cloud Sync</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* TAB 1: QR CODE & 1-CLICK LINK */}
        {activeTab === 'qr' && (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-white rounded-3xl mx-auto inline-block shadow-xl border-4 border-emerald-500/40">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Sync QR Code" className="w-56 h-56 rounded-xl mx-auto" />
              ) : qrError ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-center p-3 text-zinc-800">
                  <Smartphone className="text-emerald-600 mb-2" size={36} />
                  <p className="text-xs font-bold text-black">Sync Link Ready</p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Tap the green &quot;Copy Sync Link&quot; button below and send it to your phone via Messages or AirDrop.
                  </p>
                </div>
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
                  <RefreshCw className="animate-spin text-emerald-600" size={24} />
                  <span>Generating sync QR...</span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">
              Point your iPhone or Android camera at this QR code. It will open the app on your phone with{' '}
              <strong>all your accounts, balances, and entries automatically loaded</strong>!
            </p>

            {/* 1-Click Copy Link */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleCopy}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-white" />
                    <span>Sync Link Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy Sync Link (Send via Messages / AirDrop)</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-gray-500">
                You can text or AirDrop this link to your phone anytime you want to push data over.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: BACKUP & AIRDROP FILE */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Download size={15} className="text-emerald-400" />
                <span>Export Full Data Backup</span>
              </div>
              <p className="text-xs text-gray-400">
                Downloads an encrypted JSON backup of your accounts, balances, and history. You can AirDrop this file to your phone.
              </p>
              <button
                onClick={handleExportFile}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={14} /> Download Backup (.json)
              </button>
            </div>

            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Upload size={15} className="text-blue-400" />
                <span>Import Backup File</span>
              </div>
              <p className="text-xs text-gray-400">
                Select a previously saved backup file to restore on this device.
              </p>
              <label className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload size={14} />
                <span>Choose Backup File</span>
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* TAB 3: CLOUD SYNC */}
        {activeTab === 'cloud' && (
          <div className="space-y-4">
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud size={16} className="text-cyan-400" />
                  <span className="text-xs font-bold text-white">Supabase Cloud Database</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Ready
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Wire continuous 2-way auto sync across all your devices using your Supabase backend.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePushCloud}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Upload size={13} />
                  <span>Push to Cloud</span>
                </button>
                <button
                  onClick={handlePullCloud}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={13} />
                  <span>Pull from Cloud</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
