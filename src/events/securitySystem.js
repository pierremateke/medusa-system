const { Events, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config.json');

const spamTracker = new Map();

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        const securityConfig = config.securitySystem;

        if (!securityConfig.enabled || message.author.bot || !message.guild) return;
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const content = message.content.toLowerCase();
        const userId = message.author.id;
        const now = Date.now();

        // === Anti-Blacklisted Words / Ads ===
        if (securityConfig.blacklistedWords.some(word => content.includes(word))) {
            await handleViolation(message, 'Blacklisted word or advertisement detected.');
            return;
        }

        // === Anti @everyone/@here ===
        if (securityConfig.blockEveryonePing && message.mentions.everyone) {
            await handleViolation(message, '@everyone/@here spam detected.');
            return;
        }

        // === Anti Invisible Characters ===
        if (securityConfig.blockInvisibleChars && /[\u200B-\u200D\uFEFF]/.test(content)) {
            await handleViolation(message, 'Invisible character spam.');
            return;
        }

        // === Spam Protection ===
        const timestamps = spamTracker.get(userId)?.filter(ts => now - ts < securityConfig.spamInterval) || [];
        timestamps.push(now);
        spamTracker.set(userId, timestamps);

        if (timestamps.length >= securityConfig.spamThreshold) {
            await handleViolation(message, 'Spam detected (too many messages).');
            return;
        }
    },
};

async function handleViolation(message, reason) {
    try {
        await message.delete().catch(() => {});

        const member = message.member;
        const securityConfig = config.securitySystem;

        // Add mute role
        const muteRole = message.guild.roles.cache.find(role => role.name.toLowerCase().includes('mute'));
        if (muteRole) {
            await member.roles.add(muteRole, reason).catch(() => {});
        }

        // Log the action
        const logChannel = message.guild.channels.cache.get(securityConfig.logChannelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.mainColor)
                .setTitle('SECURTIY')
                .setDescription(`**User:** ${member}\n**Grund:** ${reason}`)
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

            await logChannel.send({ embeds: [embed] });
        }

        // DM the user
        try {
            await member.send(`Du wurdest in **${message.guild.name}** gemuted. Grund: ${reason}`);
        } catch {
            console.log('Konnte Benutzer keine DM senden.');
        }

    } catch (err) {
        console.error('Fehler beim Behandeln eines Verstoßes:', err);
    }
}
