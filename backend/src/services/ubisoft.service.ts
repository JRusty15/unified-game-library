import axios from 'axios';
import { GameInfo, PlatformIntegration } from './platform.interface';

export class UbisoftService implements PlatformIntegration {
  name = 'ubisoft';

  private parseJweHeader(ticket: string): any {
    try {
      // JWE format is header.encryptedKey.iv.ciphertext.tag
      // The header is the first part, base64url encoded
      const parts = ticket.split('.');
      if (parts.length >= 1) {
        const headerJson = Buffer.from(parts[0], 'base64').toString('utf-8');
        return JSON.parse(headerJson);
      }
    } catch (e) {
      console.error('Failed to parse Ubisoft JWE header:', e);
    }
    return null;
  }

  async authenticate(params: { ticket: string }): Promise<any> {
    let rawInput = params.ticket;
    
    // Automatically URL decode if it contains encoded characters
    if (rawInput.includes('%')) {
      try {
        rawInput = decodeURIComponent(rawInput);
      } catch (e) {}
    }

    let ticket = '';
    let sessionId = '';
    let appId = 'f35adcb5-1911-440c-b1c9-48fdc1701c68'; // Default fallback

    // 1. Try to find the ticket
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

    if (!ticket) {
      throw new Error('Could not find a valid Ubisoft ticket in your input.');
    }

    // 2. Try to extract metadata from the JWE ticket header if possible
    const jweHeader = this.parseJweHeader(ticket);
    if (jweHeader) {
      if (jweHeader.aid) appId = jweHeader.aid;
      if (jweHeader.sid) sessionId = jweHeader.sid;
      console.log(`Extracted metadata from JWE header - AppId: ${appId}, SessionId: ${sessionId}`);
    }

    // 3. Fallback/Override: Try to find sessionId/appId in the raw input (json fields)
    if (!sessionId || !appId || appId === 'f35adcb5-1911-440c-b1c9-48fdc1701c68') {
      const sessionMatch = rawInput.match(/(?:sessionId["']?\s*[:=]\s*["']|Ubi-SessionId=)([a-f0-9-]{36})/i);
      if (sessionMatch) sessionId = sessionMatch[1];

      const appIdMatch = rawInput.match(/(?:aid|appId|Ubi-AppId)["']?\s*[:=]\s*["']([a-f0-9-]{36})/i);
      if (appIdMatch) appId = appIdMatch[1];
    }

    console.log(`Final Ubisoft Params - Ticket: ${ticket.substring(0, 20)}..., SessionId: ${sessionId || 'none'}, AppId: ${appId}`);

    try {
      // Get user profile info to verify ticket
      const response = await axios.get('https://public-ubiservices.ubi.com/v3/profiles/me', {
        headers: {
          'Ubi-AppId': appId,
          'Authorization': `Ubi_v1 t=${ticket}`,
          ...(sessionId ? { 'Ubi-SessionId': sessionId } : {}),
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
      if (error.response?.status === 401) {
        throw new Error('Ubisoft ticket is invalid or expired. Please provide a fresh session.');
      }
      throw new Error('Failed to verify Ubisoft ticket');
    }
  }

  async fetchGames(credentials: { ticket: string; sessionId?: string; appId?: string; accountId: string }): Promise<GameInfo[]> {
    const { ticket, sessionId, appId, accountId } = credentials;
    const finalAppId = appId || 'f35adcb5-1911-440c-b1c9-48fdc1701c68';
    
    console.log(`Fetching Ubisoft games - AppId: ${finalAppId}, Account: ${accountId}`);

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
      
      const games = entitlements.filter((e: any) => e.type?.toLowerCase() === 'game');

      return games.map((game: any) => ({
        externalId: game.platformAppId || game.productId || game.id,
        title: game.name || 'Unknown Ubisoft Game',
        platform: 'ubisoft',
        metadata: {
          productId: game.productId,
          originalType: game.type
        },
      }));
    } catch (error: any) {
      console.error('Ubisoft fetchGames error:', error.response?.status, error.response?.data);
      throw error;
    }
  }
}
