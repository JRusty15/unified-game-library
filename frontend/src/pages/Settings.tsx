import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';

const API_URL = '/api';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newAccount, setNewAccount] = useState({ 
    platform: 'steam', 
    accountName: '', 
    accountId: '',
    code: '', 
    cookies: '',
    ticket: '',
    npsso: ''
  });
  const [loading, setLoading] = useState(false);
  
  const [sgdbKey, setSgdbKey] = useState('');
  const [steamKey, setSteamKey] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        axios.get(`${API_URL}/settings`),
        axios.get(`${API_URL}/accounts`)
      ]);
      setSettings(sRes.data);
      setAccounts(aRes.data);
      
      const sgdb = sRes.data.find((s: any) => s.key === 'steamgriddb_api_key')?.value || '';
      const steam = sRes.data.find((s: any) => s.key === 'steam_api_key')?.value || '';
      setSgdbKey(sgdb);
      setSteamKey(steam);
    } catch (err) {
      console.error(err);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    await axios.post(`${API_URL}/settings`, { key, value });
  };

  const createAccount = async () => {
    let accountData: any = { 
      platform: newAccount.platform, 
      accountName: newAccount.accountName,
      accountId: newAccount.accountId,
      credentials: {}
    };

    if (newAccount.platform === 'gog') {
      accountData.credentials = { cookies: newAccount.cookies };
    } else if (newAccount.platform === 'epic') {
      try {
        const authRes = await axios.post(`${API_URL}/accounts/authenticate`, {
          platform: 'epic',
          params: { code: newAccount.code }
        });
        accountData.accountId = authRes.data.accountId;
        accountData.credentials = { 
          accessToken: authRes.data.accessToken,
          refreshToken: authRes.data.refreshToken,
          expiresAt: authRes.data.expiresAt
        };
      } catch (err) {
        alert('Epic authentication failed. Check your exchange code.');
        return;
      }
    } else if (newAccount.platform === 'ubisoft') {
      try {
        const authRes = await axios.post(`${API_URL}/accounts/authenticate`, {
          platform: 'ubisoft',
          params: { ticket: newAccount.ticket }
        });
        accountData.accountId = authRes.data.accountId;
        accountData.accountName = newAccount.accountName || authRes.data.accountName;
        accountData.credentials = { 
          ticket: authRes.data.ticket,
          sessionId: authRes.data.sessionId,
          appId: authRes.data.appId
        };
      } catch (err) {
        alert('Ubisoft authentication failed. Check your session ticket.');
        return;
      }
    } else if (newAccount.platform === 'playstation') {
      try {
        const authRes = await axios.post(`${API_URL}/accounts/authenticate`, {
          platform: 'playstation',
          params: { npsso: newAccount.npsso }
        });
        accountData.accountId = 'me'; // PSN-API uses 'me' for current user
        accountData.credentials = { 
          npsso: authRes.data.npsso,
          accessToken: authRes.data.accessToken,
          refreshToken: authRes.data.refreshToken,
          expiresAt: authRes.data.expiresAt
        };
      } catch (err) {
        alert('PlayStation authentication failed. Check your NPSSO token.');
        return;
      }
    }

    await axios.post(`${API_URL}/accounts`, accountData);
    setNewAccount({ platform: 'steam', accountName: '', accountId: '', code: '', cookies: '', ticket: '', npsso: '' });
    fetchData();
  };

  const syncAccount = async (id: string) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/accounts/${id}/sync`);
      alert('Sync successful');
    } catch (err) {
      alert('Sync failed');
    }
    setLoading(false);
  };

  const deleteAccount = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this account and all its games?')) return;
    try {
      await axios.delete(`${API_URL}/accounts/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <header>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-zinc-400">Manage your API keys and game platform accounts.</p>
      </header>

      <section className="space-y-6">
        <h3 className="text-xl font-semibold border-b border-zinc-800 pb-2">Global Config</h3>
        <div className="grid gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">SteamGridDB API Key</label>
            <input 
              type="password" 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
              value={sgdbKey}
              onChange={(e) => setSgdbKey(e.target.value)}
              onBlur={() => saveSetting('steamgriddb_api_key', sgdbKey)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Steam Web API Key</label>
            <input 
              type="password" 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
              value={steamKey}
              onChange={(e) => setSteamKey(e.target.value)}
              onBlur={() => saveSetting('steam_api_key', steamKey)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-semibold border-b border-zinc-800 pb-2">Platform Accounts</h3>
        
        <div className="grid gap-4">
          {accounts.map(account => (
            <div key={account.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold uppercase text-xs text-indigo-400">{account.platform}</div>
                <div className="text-lg">{account.accountName}</div>
                <div className="text-xs text-zinc-500">ID: {account.accountId}</div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => syncAccount(account.id)}
                  disabled={loading}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                  title="Sync Library"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={() => deleteAccount(account.id)}
                  className="p-2 hover:bg-red-900/20 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-6 rounded-xl space-y-4">
          <h4 className="font-medium">Add New Account</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold">Platform</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2"
                value={newAccount.platform}
                onChange={(e) => setNewAccount({...newAccount, platform: e.target.value})}
              >
                <option value="steam">Steam</option>
                <option value="epic">Epic Games Store</option>
                <option value="gog">GOG.com</option>
                <option value="playstation">PlayStation Network</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold">Display Name</label>
              <input 
                placeholder="e.g. My Primary Account"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2"
                value={newAccount.accountName}
                onChange={(e) => setNewAccount({...newAccount, accountName: e.target.value})}
              />
            </div>
          </div>

          {newAccount.platform === 'steam' && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold">SteamID64</label>
              <input 
                placeholder="e.g. 76561198..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2"
                value={newAccount.accountId}
                onChange={(e) => setNewAccount({...newAccount, accountId: e.target.value})}
              />
            </div>
          )}

          {newAccount.platform === 'gog' && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold">Session Cookies</label>
              <textarea 
                placeholder="Paste your GOG cookies here..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 h-24 font-mono text-xs"
                value={newAccount.cookies}
                onChange={(e) => setNewAccount({...newAccount, cookies: e.target.value})}
              />
              <p className="text-[10px] text-zinc-500">
                Log in to GOG.com, open DevTools (F12) -&gt; Application -&gt; Cookies, and copy the values.
              </p>
            </div>
          )}

          {newAccount.platform === 'epic' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-sm">
                <p className="mb-2 font-bold">To link Epic Games:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>
                    <a 
                      href="https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline"
                    >
                      Click here to log in to Epic
                    </a>
                  </li>
                  <li>You will see a raw JSON response. Copy the 32-character value next to <strong>"authorizationCode"</strong>.</li>
                  <li>Paste it below and click Add Account immediately (it expires in 5 minutes).</li>
                </ol>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase font-bold">Exchange Code</label>
                <input 
                  placeholder="Paste the 32-character code here"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 font-mono"
                  value={newAccount.code}
                  onChange={(e) => setNewAccount({...newAccount, code: e.target.value})}
                />
              </div>
            </div>
          )}

          {newAccount.platform === 'playstation' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-sm">
                <p className="mb-2 font-bold">To link PlayStation Network:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Log in to <a href="https://www.playstation.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">playstation.com</a>.</li>
                  <li>In the same browser, visit <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">this link</a>.</li>
                  <li>Copy the 64-character <strong>npsso</strong> value.</li>
                  <li>Paste it below and click Add Account.</li>
                </ol>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase font-bold">NPSSO Token</label>
                <input 
                  placeholder="Paste the 64-character token here"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 font-mono"
                  value={newAccount.npsso}
                  onChange={(e) => setNewAccount({...newAccount, npsso: e.target.value})}
                />
              </div>
            </div>
          )}

          <button 
            onClick={createAccount}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 mt-4"
          >
            <Plus className="w-5 h-5" />
            Add Account
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
