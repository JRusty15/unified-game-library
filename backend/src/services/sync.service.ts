import prisma from '../lib/prisma';
import { SteamService } from './steam.service';
import { GogService } from './gog.service';
import { EpicService } from './epic.service';
import { UbisoftService } from './ubisoft.service';
import { SteamGridDBService } from './steamgriddb.service';

import { PlaystationService } from './playstation.service';

export class SyncService {
  private steamService = new SteamService();
  private gogService = new GogService();
  private epicService = new EpicService();
  private ubisoftService = new UbisoftService();
  private playstationService = new PlaystationService();

  async syncAccount(accountId: string) {
    try {
      const account = await prisma.platformAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) throw new Error('Account not found');

      const credentials = JSON.parse(account.credentials || '{}');
      
      // Get SteamGridDB API key from settings
      const sgdbSetting = await prisma.setting.findUnique({ where: { key: 'steamgriddb_api_key' } });
      const sgdbService = sgdbSetting ? new SteamGridDBService(sgdbSetting.value) : null;

      let games: any[] = [];
      if (account.platform === 'steam') {
        const steamApiKeySetting = await prisma.setting.findUnique({ where: { key: 'steam_api_key' } });
        if (!steamApiKeySetting) throw new Error('Steam API Key not configured');
        
        games = await this.steamService.fetchGames({ 
          steamId: account.accountId!, 
          apiKey: steamApiKeySetting.value 
        });
      } else if (account.platform === 'gog') {
        games = await this.gogService.fetchGames({ cookies: credentials.cookies });
      } else if (account.platform === 'epic') {
        games = await this.epicService.fetchGames({ 
          accessToken: credentials.accessToken, 
          accountId: account.accountId! 
        });
      } else if (account.platform === 'ubisoft') {
        games = await this.ubisoftService.fetchGames({ 
          ticket: credentials.ticket, 
          sessionId: credentials.sessionId,
          appId: credentials.appId,
          accountId: account.accountId! 
        });
      } else if (account.platform === 'playstation') {
        games = await this.playstationService.fetchGames({ 
          npsso: credentials.npsso
        });
      }

      console.log(`Syncing ${games.length} games for ${account.platform}...`);

      const syncedExternalIds = new Set<string>();

      for (const gameData of games) {
        syncedExternalIds.add(gameData.externalId);
        
        let game = await prisma.game.findUnique({
          where: {
            platform_externalId_platformAccountId: {
              platform: gameData.platform,
              externalId: gameData.externalId,
              platformAccountId: account.id,
            },
          },
        });

        if (!game) {
          let coverUrl = null;
          if (sgdbService) {
            coverUrl = await sgdbService.getGameCover(gameData.platform, gameData.externalId);
            if (!coverUrl) {
              coverUrl = await sgdbService.searchAndGetCover(gameData.title);
            }
          }

          game = await prisma.game.create({
            data: {
              title: gameData.title,
              platform: gameData.platform,
              externalId: gameData.externalId,
              coverUrl: coverUrl,
              platformAccountId: account.id,
              metadata: JSON.stringify(gameData.metadata),
            },
          });
        } else {
          // Update existing game titles and metadata (to fix "random strings")
          let coverUrl = game.coverUrl;
          if (!coverUrl && sgdbService) {
            coverUrl = await sgdbService.getGameCover(gameData.platform, gameData.externalId);
            if (!coverUrl) {
              coverUrl = await sgdbService.searchAndGetCover(gameData.title);
            }
          }

          await prisma.game.update({
            where: { id: game.id },
            data: {
              title: gameData.title,
              metadata: JSON.stringify(gameData.metadata),
              coverUrl: coverUrl,
            },
          });
        }
      }

      // Cleanup: Remove games that were previously synced but are no longer in the fetched list
      // Only do this if we actually fetched games (avoid wiping library on API failure)
      if (games.length > 0) {
        const result = await prisma.game.deleteMany({
          where: {
            platformAccountId: account.id,
            externalId: {
              notIn: Array.from(syncedExternalIds)
            }
          }
        });
        if (result.count > 0) {
          console.log(`Removed ${result.count} stale/duplicate games for ${account.platform}`);
        }
      }

      await prisma.platformAccount.update({
        where: { id: account.id },
        data: { lastSync: new Date() },
      });
      console.log('Sync completed successfully');
    } catch (error: any) {
      console.error(`Sync error for account ${accountId}:`, error);
      throw error;
    }
  }
}
