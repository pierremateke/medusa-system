const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const ADMIN_ROLE_ID = '1380000149371359254'; 
const LOG_CHANNEL_ID = '1380000306859085845'; 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('frak-offiziell')
        .setDescription('» Verkündet die offizielle Gründung einer Fraktion.')
        .addStringOption(option =>
            option.setName('fraktion')
                .setDescription('Der Name der Fraktion, die offiziell gegründet wird.')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('probephase')
                .setDescription('Ist die Fraktion in der Probephase? (Ja/Nein)')
                .setRequired(true)),
    async execute(interaction) {
        try {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return await interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl auszuführen.', ephemeral: true });
            }
            const fraktion = interaction.options.getString('fraktion');
            const isProbephase = interaction.options.getBoolean('probephase');
            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (!logChannel) {
                return await interaction.reply({ content: 'Der Log-Kanal konnte nicht gefunden werden.', ephemeral: true });
            }
            const nowUnix = Math.floor(Date.now() / 1000);
            const sevenDaysLaterUnix = nowUnix + 7 * 24 * 60 * 60; 
            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.successColor)
                .setTitle('OFFIZIELL')
                .setDescription(
                    `Die Fraktion **${fraktion}** ist nun offiziell!\n\n` +
                    `**Probephase:** ${isProbephase ? 'Ja' : 'Nein'}\n` +
                    `**Aufbau-Schutz:** Bis <t:${sevenDaysLaterUnix}:f>\n` +
                    `**Am:** <t:${nowUnix}:f>\n\n` +
                    `Mit freundlichen Grüßen,\n<@${interaction.user.id}>`
                )
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
            await logChannel.send({ embeds: [embed] });
            await interaction.reply({ content: 'Die Fraktionsgründung wurde erfolgreich verkündet.', ephemeral: true });
        } catch (error) {
            console.error('Fehler beim Ausführen des Befehls:', error);
            await interaction.reply({ content: 'Es gab ein Problem beim Ausführen des Befehls.', ephemeral: true });
        }
    },
};