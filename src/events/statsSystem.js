const { Events } = require('discord.js');

const MEMBER_COUNT_CHANNEL_ID = '1380000247987703889';
const BOOST_COUNT_CHANNEL_ID = '1380000251389284372';
const TICKET_COUNT_CHANNEL_ID = '1380000249032085525';
const TICKET_CATEGORY_IDS = [
    '1380000240345808906',
    '1380000241734123641',
    '1380000242828705883',
    '1380000243730350264',
    '1380000245118926869',
    '1380000246150467635',
];

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        const guild = client.guilds.cache.first(); // Passe ggf. an, falls mehrere Guilds!
        if (!guild) return;

        // Funktion zum Aktualisieren der Statistik-Channels
        const updateStats = async () => {
            // Mitgliederanzahl
            const memberCount = guild.memberCount;
            const memberChannel = guild.channels.cache.get(MEMBER_COUNT_CHANNEL_ID);
            if (memberChannel) {
                await memberChannel.setName(`👥︱Mitglieder: ${memberCount}`);
            }

            // Boost-Anzahl
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostChannel = guild.channels.cache.get(BOOST_COUNT_CHANNEL_ID);
            if (boostChannel) {
                await boostChannel.setName(`💕︱Boosts: ${boostCount}`);
            }

            // Offene Tickets (Anzahl der Textkanäle in den Ticket-Kategorien)
            let ticketCount = 0;
            for (const catId of TICKET_CATEGORY_IDS) {
                const category = guild.channels.cache.get(catId);
                if (category) {
                    ticketCount += guild.channels.cache.filter(
                        c => c.parentId === catId && c.type === 0 // 0 = TextChannel
                    ).size;
                }
            }
            const ticketChannel = guild.channels.cache.get(TICKET_COUNT_CHANNEL_ID);
            if (ticketChannel) {
                await ticketChannel.setName(`🎫︱Tickets: ${ticketCount}`);
            }
        };

        // Initiales Update
        await updateStats();

        // Alle 60 Sekunden aktualisieren
        setInterval(updateStats, 60000);
    }
};