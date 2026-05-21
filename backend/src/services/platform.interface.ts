export interface GameInfo {
  externalId: string;
  title: string;
  platform: string;
  metadata?: any;
}

export interface PlatformIntegration {
  name: string;
  fetchGames(credentials: any): Promise<GameInfo[]>;
  authenticate?(params: any): Promise<any>; // Returns credentials
}
