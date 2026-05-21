import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { SyncService } from '../services/sync.service';
import { EpicService } from '../services/epic.service';
import { UbisoftService } from '../services/ubisoft.service';

const syncService = new SyncService();
const epicService = new EpicService();
const ubisoftService = new UbisoftService();

export const getAccounts = async (req: Request, res: Response) => {
  const accounts = await prisma.platformAccount.findMany();
  res.json(accounts);
};

export const createAccount = async (req: Request, res: Response) => {
  const { platform, accountName, accountId, credentials } = req.body;
  const account = await prisma.platformAccount.create({
    data: { platform, accountName, accountId, credentials: JSON.stringify(credentials) },
  });
  res.json(account);
};

export const authenticatePlatform = async (req: Request, res: Response) => {
  const { platform, params } = req.body;
  try {
    if (platform === 'epic') {
      const authData = await epicService.authenticate({ exchangeCode: params.code });
      res.json(authData);
    } else if (platform === 'ubisoft') {
      const authData = await ubisoftService.authenticate({ ticket: params.ticket });
      res.json({
        ticket: authData.ticket,
        sessionId: authData.sessionId,
        appId: authData.appId,
        accountId: authData.accountId,
        accountName: authData.accountName
      });
    } else {
      res.status(400).json({ error: 'Unsupported platform for direct auth' });
    }
  } catch (error: any) {
    console.error('Auth error detail:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};

export const syncAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await syncService.syncAccount(id as string);
    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Delete games associated with the account first
    await prisma.game.deleteMany({ where: { platformAccountId: id as string } });
    await prisma.platformAccount.delete({ where: { id: id as string } });
    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
