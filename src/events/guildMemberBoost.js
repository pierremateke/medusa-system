const { Events, EmbedBuilder } = require('discord.js');
const { logSuccess, logError } = require('../utils/logger');
const config = require('../config.json');
module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        try {
            if (!oldMember.premiumSince && newMember.premiumSince) {
                const boostConfig = config.boostSystem;
                const boostChannelId = boostConfig.channelId;
                const boostChannel = newMember.guild.channels.cache.get(boostChannelId);
                if (!boostChannel) {
                    logError(`Boost-Kanal mit der ID ${boostChannelId} wurde nicht gefunden.`);
                    return;
                }
                const boostCount = newMember.guild.premiumSubscriptionCount || 0;
                const boostLevel = newMember.guild.premiumTier || 0;
                const embed = new EmbedBuilder()
                    .setColor(config.embedSettings.mainColor)
                    .setTitle(boostConfig.embedTitle)
                    .setDescription(
                        boostConfig.embedDescription
                            .replace(/\${user}/g, newMember.user.toString())
                            .replace(/\${boostCount}/g, boostCount.toString())
                            .replace(/\${boostLevel}/g, boostLevel.toString())
                    )
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
                    .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
                    .setImage(boostConfig.embedimage)
                await boostChannel.send({
                    content: `${newMember.user}`,
                    embeds: [embed],
                });
                logSuccess(`Boost-Nachricht an ${newMember.user.tag} gesendet.`);
            }
        } catch (error) {
            logError(`Ein Fehler im guildMemberBoost-Event ist aufgetreten: ${error.message}`);
        }
    },
};