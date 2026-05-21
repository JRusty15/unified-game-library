import axios from 'axios';
import { GameInfo, PlatformIntegration } from './platform.interface';

export class GogService implements PlatformIntegration {
  name = 'gog';

  async fetchGames(credentials: { cookies: string }): Promise<GameInfo[]> {
    const { cookies: rawCookies } = credentials;
    
    // Improved cookie parsing to find key-value pairs anywhere in the pasted text
    const cookieMap = new Map<string, string>();
    const allowedCookies = [
      'gsi', 'gog-session-id', 'main_session', 
      'gog-al', 'galaxy-login-s', 'galaxy-login-al',
      'gog_us', 'gog_lc', 'csrf', 'login-al', 'login-s'
    ];
    
    // Strategy: Look for the key and take the very next non-empty string as the value
    const tokens = rawCookies.split(/[\s\t\n;=]+/).map(t => t.trim()).filter(t => t.length > 0);
    for (let i = 0; i < tokens.length; i++) {
      if (allowedCookies.includes(tokens[i]) && i + 1 < tokens.length) {
        cookieMap.set(tokens[i], tokens[i + 1]);
      }
    }

    const foundCookies = Array.from(cookieMap.keys());
    console.log(`Identified GOG cookies: ${foundCookies.join(', ')}`);

    if (foundCookies.length === 0) {
      throw new Error('No valid GOG cookies found. Please copy the entire cookie table from DevTools.');
    }

    const cleanCookies = Array.from(cookieMap.entries())
      .map(([name, val]) => `${name}=${val}`)
      .join('; ');

    // Use GOG Galaxy 2.0 API endpoint which is usually more stable
    const url = 'https://api.gog.com/v2/games';

    const response = await axios.get(url, {
      headers: {
        'Cookie': cleanCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    // The v2 API returns an array of games directly or in a nested property
    const games = response.data._embedded?.items || response.data.items || [];
    console.log(`Fetched ${games.length} games from GOG v2 API`);
    if (games.length > 0) {
      console.log('Sample GOG v2 Item:', JSON.stringify(games[0], null, 2));
    }

    return games.map((item: any) => {
      const product = item._embedded?.product || item;
      return {
        externalId: (product.id || item.id || '').toString(),
        title: product.title || item.title || 'Unknown GOG Game',
        platform: 'gog',
        metadata: {
          slug: product.slug || item.slug || '',
        },
      };
    });
  }
}
