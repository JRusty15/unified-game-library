import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getGames = async (req: Request, res: Response) => {
  try {
    const games = await prisma.game.findMany({
      include: {
        platformAccount: true,
      },
      orderBy: {
        title: 'asc',
      },
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
};
