import axios from 'axios';
import { GameInfo, PlatformIntegration } from './platform.interface';

export class SteamService implements PlatformIntegration {
  name = 'steam';

  async fetchGames(credentials: { steamId: string; apiKey: string }): Promise<GameInfo[]> {
    const { steamId, apiKey } = credentials;
    const url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=true`;

    const response = await axios.get(url);
    const games = response.data.response.games || [];

    return games.map((game: any) => ({
      externalId: game.appid.toString(),
      title: game.name,
      platform: 'steam',
      metadata: {
        playtime_forever: game.playtime_forever,
        img_icon_url: game.img_icon_url,
      },
    }));
  }
}
