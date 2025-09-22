const { Events, EmbedBuilder } = require('discord.js');
const { logSuccess, logError } = require('../utils/logger');
const config = require('../config.json');
module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            if (!member.guild) {
                logError('Der Server (Guild) ist für das Mitglied nicht definiert.');
                return;
            }
            const welcomeConfig = config.welcomeSystem;
            const welcomeChannelId = welcomeConfig.channelId;
            const roleId = welcomeConfig.roleId;
            const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
            const role = member.guild.roles.cache.get(roleId);
            if (!welcomeChannel) {
                logError(`Willkommenskanal mit der ID ${welcomeChannelId} wurde nicht gefunden.`);
                return;
            }
            if (!role) {
                logError(`Rolle mit der ID ${roleId} wurde nicht gefunden.`);
                return;
            }
            const memberCount = member.guild.memberCount;
            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.mainColor)
                .setTitle(welcomeConfig.embedTitle)
                .setDescription(welcomeConfig.embedDescription
                    .replace(/\${member}/g, member.toString())
                    .replace(/\${memberCount}/g, memberCount.toString()))
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
                .setThumbnail(member.user. displayAvatarURL({ dynamic: true }))
                .setImage(welcomeConfig.embedimage)
            await welcomeChannel.send({
                content: `${member}`,
                embeds: [embed],
            });
            logSuccess(`Willkommensnachricht an ${member.user.tag} gesendet.`);
            await member.roles.add(role);
            logSuccess(`Rolle "${role.name}" an ${member.user.tag} vergeben.`);
        } catch (error) {
            logError(`Ein Fehler im guildMemberAdd-Event ist aufgetreten: ${error.message}`);
        }
    },
};