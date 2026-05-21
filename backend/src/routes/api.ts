import { Router } from 'express';
import * as gameController from '../controllers/game.controller';
import * as accountController from '../controllers/account.controller';
import * as settingController from '../controllers/setting.controller';

const router = Router();

router.get('/games', gameController.getGames);

router.get('/accounts', accountController.getAccounts);
router.post('/accounts', accountController.createAccount);
router.post('/accounts/authenticate', accountController.authenticatePlatform);
router.delete('/accounts/:id', accountController.deleteAccount);
router.post('/accounts/:id/sync', accountController.syncAccount);

router.get('/settings', settingController.getSettings);
router.post('/settings', settingController.updateSetting);

export default router;
