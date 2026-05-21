import axios from 'axios';
import { GameInfo, PlatformIntegration } from './platform.interface';

export class EpicService implements PlatformIntegration {
  name = 'epic';

  // Official Launcher Client ID and Secret (Base64 encoded)
  private authHeader = 'MzRhMDJjZjhmNDQxNGUyOWIxNTkyMTg3NmRhMzZmOWE6ZGFhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y=';

  async authenticate(params: { exchangeCode: string }): Promise<any> {
    console.log(`Exchanging code: ${params.exchangeCode.substring(0, 5)}...`);
    try {
      const response = await axios.post(
        'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token',
        `grant_type=authorization_code&code=${params.exchangeCode}&token_type=eg1`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${this.authHeader}`,
          },
        }
      );
      console.log('Epic token exchange successful');
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        accountId: response.data.account_id,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
      };
    } catch (error: any) {
      console.error('Epic auth error status:', error.response?.status);
      console.error('Epic auth error body:', JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  async fetchGames(credentials: { accessToken: string; accountId: string }): Promise<GameInfo[]> {
    const { accessToken, accountId } = credentials;
    const url = `https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true`;

    console.log(`Fetching Epic games for account: ${accountId}`);
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const items = response.data.records || [];
      console.log(`Found ${items.length} Epic games`);
      if (items.length > 0) {
        console.log('Sample Epic Item:', JSON.stringify(items[0], null, 2));
      }

      return items.map((item: any) => ({
        externalId: item.catalogItemId,
        title: item.sandboxName || item.title || item.appName,
        platform: 'epic',
        metadata: {
          namespace: item.namespace,
          appName: item.appName,
        },
      }));
    } catch (error: any) {
      console.error('Epic fetchGames error:', error.response?.status, JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }
}
