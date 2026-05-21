import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getSettings = async (req: Request, res: Response) => {
  const settings = await prisma.setting.findMany();
  res.json(settings);
};

export const updateSetting = async (req: Request, res: Response) => {
  const { key, value } = req.body;
  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  res.json(setting);
};
