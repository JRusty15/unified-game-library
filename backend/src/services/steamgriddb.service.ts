import axios from 'axios';

export class SteamGridDBService {
  private apiKey: string;
  private baseUrl = 'https://www.steamgriddb.com/api/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getGameCover(platform: string, externalId: string): Promise<string | null> {
    try {
      // SteamGridDB supports direct lookup by steam appid
      let endpoint = '';
      if (platform === 'steam') {
        endpoint = `${this.baseUrl}/grids/steam/${externalId}`;
      } else {
        // For other platforms, we might need to search for the game first
        // This is a simplified version; in a real app, we'd search by name
        return null;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        params: { dimensions: ['600x900', '342x482'].join(',') }, // Use comma-separated string for dimensions
      });

      if (response.data.success && response.data.data.length > 0) {
        return response.data.data[0].url;
      }
    } catch (error) {
      console.error(`SteamGridDB error for ${platform}:${externalId}:`, error);
    }
    return null;
  }

  async searchAndGetCover(query: string): Promise<string | null> {
    try {
      const searchResponse = await axios.get(`${this.baseUrl}/search/autocomplete/${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (searchResponse.data.success && searchResponse.data.data.length > 0) {
        const gameId = searchResponse.data.data[0].id;
        const gridResponse = await axios.get(`${this.baseUrl}/grids/game/${gameId}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          params: { dimensions: ['600x900', '342x482'].join(',') },
        });

        if (gridResponse.data.success && gridResponse.data.data.length > 0) {
          return gridResponse.data.data[0].url;
        }
      }
    } catch (error) {
      console.error(`SteamGridDB search error for ${query}:`, error);
    }
    return null;
  }
}
