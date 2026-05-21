"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function fixUbisoft() {
    console.log('Starting Ubisoft fix script...');
    const account = await prisma.platformAccount.findFirst({
        where: { platform: 'ubisoft' }
    });
    if (!account) {
        console.log('No Ubisoft account found in database');
        const all = await prisma.platformAccount.findMany();
        console.log('Available platforms:', all.map(a => a.platform));
        return;
    }
    console.log('Found Ubisoft account:', account.id);
    const credentials = JSON.parse(account.credentials || '{}');
    const ticket = credentials.ticket;
    if (!ticket) {
        console.log('No ticket found in credentials');
        return;
    }
    try {
        const parts = ticket.split('.');
        console.log('Ticket parts count:', parts.length);
        if (parts.length >= 1) {
            const headerJson = Buffer.from(parts[0], 'base64').toString('utf-8');
            const header = JSON.parse(headerJson);
            console.log('Extracted Header:', JSON.stringify(header));
            credentials.sessionId = header.sid || credentials.sessionId;
            credentials.appId = header.aid || credentials.appId;
            const updated = await prisma.platformAccount.update({
                where: { id: account.id },
                data: { credentials: JSON.stringify(credentials) }
            });
            console.log('Database updated successfully for account:', updated.id);
            console.log('Final SessionId:', credentials.sessionId);
            console.log('Final AppId:', credentials.appId);
        }
    }
    catch (e) {
        console.error('Failed to fix database:', e);
    }
    finally {
        await prisma.$disconnect();
        console.log('Script finished.');
    }
}
fixUbisoft();
