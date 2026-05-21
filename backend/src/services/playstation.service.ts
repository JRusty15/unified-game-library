import { 
  exchangeNpssoForCode, 
  exchangeCodeForAccessToken, 
  getUserTitles,
  getRecentlyPlayedGames,
  getPurchasedGames
} from "psn-api";
import { GameInfo, PlatformIntegration } from './platform.interface';

export class PlaystationService implements PlatformIntegration {
  name = 'playstation';

  async authenticate(params: { npsso: string }): Promise<any> {
    const { npsso } = params;
    
    try {
      // 1. Exchange NPSSO for an access code
      const accessCode = await exchangeNpssoForCode(npsso);
      
      // 2. Exchange access code for an access token
      const authorization = await exchangeCodeForAccessToken(accessCode);

      // Return credentials to be stored in the database
      return {
        npsso,
        accessToken: authorization.accessToken,
        refreshToken: authorization.refreshToken,
        expiresAt: new Date(Date.now() + authorization.expiresIn * 1000).toISOString()
      };
    } catch (error: any) {
      console.error('Playstation auth error:', error.message);
      throw new Error('Failed to authenticate with PlayStation. Your NPSSO token might be invalid or expired.');
    }
  }

  async fetchGames(credentials: { npsso: string }): Promise<GameInfo[]> {
    const { npsso } = credentials;
    
    try {
      // Re-authenticate to get a fresh token (easiest for now, since NPSSO is long-lived)
      const accessCode = await exchangeNpssoForCode(npsso);
      const authorization = await exchangeCodeForAccessToken(accessCode);

      // We'll use multiple maps to track games and avoid duplicates
      // Primary map is externalId (titleId or npCommunicationId)
      const gamesMap = new Map<string, GameInfo>();
      // Secondary map for conceptId matching (PS4/PS5 games often share a conceptId)
      const conceptMap = new Map<string, string>(); // conceptId -> externalId
      // Tertiary map for normalized title matching
      const titleMap = new Map<string, string>(); // normalizedTitle -> externalId

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/preorder$/, '').replace(/trophies$/, '');

      const addGame = (id: string, game: GameInfo) => {
        const conceptId = game.metadata?.conceptId;
        const normTitle = normalize(game.title);

        // Check if we already have this game by ID
        if (gamesMap.has(id)) return;

        // Check if we already have this game by conceptId
        if (conceptId && conceptMap.has(conceptId)) {
          const existingId = conceptMap.get(conceptId)!;
          // If the new one has more metadata (like productId), we might want to update, 
          // but for now let's just keep the first one found (usually Recently Played).
          return;
        }

        // Check if we already have this game by normalized title
        if (titleMap.has(normTitle)) {
          return;
        }

        // Add to maps
        gamesMap.set(id, game);
        if (conceptId) conceptMap.set(conceptId, id);
        titleMap.set(normTitle, id);
      };

      // 1. Fetch Recently Played Games
      try {
        const recentlyPlayed = await getRecentlyPlayedGames(authorization);
        const playedGames = recentlyPlayed.data?.gameLibraryTitlesRetrieve?.games || [];
        console.log(`Fetched ${playedGames.length} recently played PlayStation games`);
        
        for (const game of playedGames) {
          addGame(game.titleId, {
            externalId: game.titleId,
            title: game.name,
            platform: 'playstation',
            metadata: {
              platform: game.platform,
              conceptId: game.conceptId,
              productId: game.productId,
              lastPlayed: game.lastPlayedDateTime
            },
          });
        }
      } catch (e: any) {
        console.error('Error fetching recently played games:', e.message);
      }

      // 2. Fetch Purchased Games
      try {
        let start = 0;
        let isLast = false;
        const size = 100;
        
        while (!isLast) {
          const purchased: any = await getPurchasedGames(authorization, { start, size });
          const purchasedGames = purchased.data?.purchasedTitlesRetrieve?.games || [];
          console.log(`Fetched ${purchasedGames.length} purchased PlayStation games (start: ${start})`);
          
          for (const game of purchasedGames) {
            addGame(game.titleId, {
              externalId: game.titleId,
              title: game.name,
              platform: 'playstation',
              metadata: {
                platform: game.platform,
                conceptId: game.conceptId,
                productId: game.productId
              },
            });
          }
          
          const pageInfo = purchased.data?.purchasedTitlesRetrieve?.pageInfo;
          isLast = pageInfo?.isLast ?? true;
          start = (pageInfo?.offset ?? start) + (pageInfo?.size ?? purchasedGames.length);
          
          if (start >= (pageInfo?.totalCount ?? 0)) isLast = true;
        }
      } catch (e: any) {
        console.error('Error fetching purchased games:', e.message);
      }

      // 3. Fetch Trophy Titles
      try {
        const trophyRes = await getUserTitles(authorization, "me");
        const trophyTitles = trophyRes.trophyTitles || [];
        console.log(`Fetched ${trophyTitles.length} PlayStation trophy titles`);

        for (const title of trophyTitles) {
          const t = title as any;
          const gameTitle = t.trophyTitleName || t.titleName || t.name || 'Unknown PlayStation Game';
          
          addGame(t.npCommunicationId, {
            externalId: t.npCommunicationId,
            title: gameTitle,
            platform: 'playstation',
            metadata: {
              platform: t.trophyTitlePlatform || t.platform || t.titlePlatform,
              service: t.npServiceName,
              communicationId: t.npCommunicationId
            },
          });
        }
      } catch (e: any) {
        console.error('Error fetching trophy titles:', e.message);
      }

      const allGames = Array.from(gamesMap.values());
      console.log(`Total unique PlayStation games combined: ${allGames.length}`);
      return allGames;

    } catch (error: any) {
      console.error('Playstation fetchGames error:', error.message);
      throw error;
    }
  }
}
