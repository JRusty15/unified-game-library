import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

const API_URL = '/api';

const Library: React.FC = () => {
  const [games, setGames] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await axios.get(`${API_URL}/games`);
      setGames(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Dynamically get unique platforms from the games list
  const availablePlatforms = React.useMemo(() => {
    const platforms = new Set<string>();
    games.forEach(game => platforms.add(game.platform));
    return Array.from(platforms).sort();
  }, [games]);

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      steam: 'Steam',
      epic: 'Epic Games',
      gog: 'GOG.com',
      ubisoft: 'Ubisoft Connect',
      playstation: 'PlayStation'
    };
    return labels[platform] || platform.toUpperCase();
  };

  // Find titles that exist on multiple platforms
  const multiPlatformTitles = React.useMemo(() => {
    const titleMap = new Map<string, Set<string>>();
    games.forEach(game => {
      // Basic normalization: lowercase and alphanumeric only
      const normalized = game.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!titleMap.has(normalized)) titleMap.set(normalized, new Set());
      titleMap.get(normalized)!.add(game.platform);
    });

    return new Set(
      Array.from(titleMap.entries())
        .filter(([_, platforms]) => platforms.size > 1)
        .map(([title, _]) => title)
    );
  }, [games]);

  const filteredGames = Array.isArray(games) 
    ? games.filter(game => {
        const normalizedTitle = game.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase());
        const matchesPlatform = platformFilter === 'all' || game.platform === platformFilter;
        const matchesMulti = !showDuplicatesOnly || multiPlatformTitles.has(normalizedTitle);
        return matchesSearch && matchesPlatform && matchesMulti;
      })
    : [];

  return (
    <div className="p-8 space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">My Library</h2>
          <p className="text-zinc-400">{filteredGames.length} games showing</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              placeholder="Search library..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500 w-full md:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 text-sm"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="all">All Platforms</option>
            {availablePlatforms.map(p => (
              <option key={p} value={p}>{getPlatformLabel(p)}</option>
            ))}
          </select>

          <button
            onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              showDuplicatesOnly 
                ? 'bg-indigo-600 border-indigo-500 text-white' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Multi-platform Only
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Games</span>
          <span className="text-2xl font-black text-white">{games.length}</span>
        </div>
        {availablePlatforms.map(platform => {
          const count = games.filter(g => g.platform === platform).length;
          return (
            <div key={platform} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center group hover:border-indigo-500/50 transition-colors">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{getPlatformLabel(platform)}</span>
              <span className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{count}</span>
            </div>
          );
        })}
      </section>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredGames.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};

const GameCard: React.FC<{ game: any }> = ({ game }) => {
  const getStoreUrl = () => {
    const metadata = game.metadata ? JSON.parse(game.metadata) : {};
    switch (game.platform) {
      case 'steam':
        return `https://store.steampowered.com/app/${game.externalId}`;
      case 'epic':
        return `https://store.epicgames.com/p/${metadata.appName || ''}`;
      case 'gog':
        return `https://www.gog.com/game/${metadata.slug || game.title.toLowerCase().replace(/ /g, '_')}`;
      case 'ubisoft':
        return `https://store.ubisoft.com/search?q=${encodeURIComponent(game.title)}`;
      case 'playstation':
        return `https://www.playstation.com/search/?q=${encodeURIComponent(game.title)}`;
      default:
        return null;
    }
  };

  const storeUrl = getStoreUrl();

  return (
    <div className="group relative aspect-[2/3] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-indigo-500 transition-all">
      {game.coverUrl ? (
        <img 
          src={game.coverUrl} 
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4 text-center">
          <span className="text-sm font-medium text-zinc-500">{game.title}</span>
        </div>
      )}
      
      {/* Platform Badge */}
      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
        <PlatformIcon platform={game.platform} />
      </div>

      {/* Hover Info */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
        <h4 className="font-bold text-lg mb-1">{game.title}</h4>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-4">{game.platform}</p>
        
        {storeUrl && (
          <a 
            href={storeUrl} 
            target="_blank" 
            rel="noreferrer"
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            VIEW IN STORE
          </a>
        )}
      </div>
    </div>
  );
};

const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
  switch (platform) {
    case 'steam':
      return <div className="text-[10px] font-bold text-white px-1">STEAM</div>;
    case 'epic':
      return <div className="text-[10px] font-bold text-white px-1">EPIC</div>;
    case 'gog':
      return <div className="text-[10px] font-bold text-white px-1">GOG</div>;
    case 'ubisoft':
      return <div className="text-[10px] font-bold text-white px-1">UBI</div>;
    case 'playstation':
      return <div className="text-[10px] font-bold text-white px-1">PSN</div>;
    default:
      return <div className="text-[10px] font-bold text-white px-1 uppercase">{platform}</div>;
  }
};

export default Library;
