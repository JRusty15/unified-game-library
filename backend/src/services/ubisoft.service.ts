import axios from 'axios';
import { GameInfo, PlatformIntegration } from './platform.interface';

export class UbisoftService implements PlatformIntegration {
  name = 'ubisoft';

  async authenticate(params: { ticket: string }): Promise<any> {
    let rawInput = params.ticket;
    
    // Automatically URL decode if it contains encoded characters (like %3D for =)
    if (rawInput.includes('%')) {
      try {
        rawInput = decodeURIComponent(rawInput);
      } catch (e) {}
    }

    let ticket = '';
    let sessionId = '';
    let appId = 'f35adcb5-1911-440c-b1c9-48fdc1701c68'; // Default fallback

    // 1. Try to find the ticket (look for the long base64 string or the JWE format)
    const ticketMatch = rawInput.match(/(?:ticket["']?\s*[:=]\s*["']|t=)([a-zA-Z0-9._\-\/+=]+)/i);
    
    if (ticketMatch) {
      ticket = ticketMatch[1];
    } else {
      const jweMatch = rawInput.match(/[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}/);
      if (jweMatch) {
        ticket = jweMatch[0];
      } else if (rawInput.length > 500 && !rawInput.includes(' ')) {
        ticket = rawInput;
      }
    }

    // 2. Try to find the sessionId (GUID format)
    const sessionMatch = rawInput.match(/(?:sessionId["']?\s*[:=]\s*["']|Ubi-SessionId=)([a-f0-9-]{36})/i);
    if (sessionMatch) {
      sessionId = sessionMatch[1];
    }

    // 3. Try to find the AppId (GUID format)
    // In GOG Galaxy/Humble tickets, it's often in a field called "aid" or "appId"
    const appIdMatch = rawInput.match(/(?:aid|appId|Ubi-AppId)["']?\s*[:=]\s*["']([a-f0-9-]{36})/i);
    if (appIdMatch) {
      appId = appIdMatch[1];
    }

    console.log(`Extracted Ubisoft - Ticket: ${ticket ? 'Yes (' + ticket.length + ')' : 'No'}, SessionId: ${sessionId ? 'Yes' : 'No'}, AppId: ${appId}`);

    if (!ticket) {
      throw new Error('Could not find a valid Ubisoft ticket in your input.');
    }

    try {
      // Get user profile info to verify ticket and get account ID
      const response = await axios.get('https://public-ubiservices.ubi.com/v3/profiles/me', {
        headers: {
          'Ubi-AppId': appId,
          'Authorization': `Ubi_v1 t=${ticket}`,
          'Ubi-SessionId': sessionId,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      return {
        ticket,
        sessionId,
        appId,
        accountId: response.data.profileId,
        accountName: response.data.username,
      };
    } catch (error: any) {
      console.error('Ubisoft auth error:', error.response?.status, error.response?.data);
      throw new Error('Failed to verify Ubisoft ticket');
    }
  }

  async fetchGames(credentials: { ticket: string; sessionId?: string; appId?: string; accountId: string }): Promise<GameInfo[]> {
    const { ticket, sessionId, appId, accountId } = credentials;
    const finalAppId = appId || 'f35adcb5-1911-440c-b1c9-48fdc1701c68';
    
    console.log(`Fetching Ubisoft games with ticket length: ${ticket.length}, sessionId: ${sessionId ? 'present' : 'missing'}, appId: ${finalAppId}`);

    // Entitlements API is more authoritative for owned games
    const url = `https://public-ubiservices.ubi.com/v1/profiles/me/global/ubiconnect/entitlement/api/entitlements`;

    const headers: any = {
      'Ubi-AppId': finalAppId,
      'Authorization': `Ubi_v1 t=${ticket}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (sessionId) {
      headers['Ubi-SessionId'] = sessionId;
    }

    try {
      const response = await axios.get(url, { headers });

      const entitlements = response.data.entitlements || [];
      console.log(`Fetched ${entitlements.length} entitlements from Ubisoft`);
      
      if (entitlements.length > 0) {
        console.log('Sample Ubisoft Entitlement:', JSON.stringify(entitlements[0], null, 2));
      }

      // Filter to only include active game titles (avoiding expired trials or duplicates)
      const games = entitlements.filter((e: any) => e.type === 'game' || e.type === 'GAME');

      return games.map((game: any) => ({
        externalId: game.platformAppId || game.id,
        title: game.name || 'Unknown Ubisoft Game',
        platform: 'ubisoft',
        metadata: {
          productId: game.productId,
        },
      }));
    } catch (error: any) {
      console.error('Ubisoft fetchGames error:', error.response?.status, JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }
}
