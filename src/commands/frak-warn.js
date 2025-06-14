const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const ADMIN_ROLE_ID = '1380000149371359254'; // Ersetze durch die ID der Admin-Rolle
const LOG_CHANNEL_ID = '1380000369177792592'; // Ersetze durch die ID des Log-Kanals

module.exports = {
    data: new SlashCommandBuilder()
        .setName('frak-warn')
        .setDescription('» Verwarnung für eine Fraktion aussprechen.')
        .addStringOption(option =>
            option.setName('fraktion')
                .setDescription('Der Name der Fraktion, die verwarnt wird.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Der Grund für die Verwarnung.')
                .setRequired(true)),
    async execute(interaction) {
        try {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return await interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl auszuführen.', ephemeral: true });
            }

            const fraktion = interaction.options.getString('fraktion');
            const reason = interaction.options.getString('grund');
            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

            if (!logChannel) {
                return await interaction.reply({ content: 'Der Log-Kanal konnte nicht gefunden werden.', ephemeral: true });
            }

            const nowUnix = Math.floor(Date.now() / 1000);

            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.warningColor)
                .setTitle('FRAKTION VERWARNT')
                .setDescription(
                    `Die Fraktion **${fraktion}** wurde verwarnt!\n\n` +
                    `**Grund:** \`${reason}\`\n` +
                    `**Am:** <t:${nowUnix}:f>\n\n` +
                    `Mit freundlichen Grüßen,\n<@${interaction.user.id}>`
                )
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

            await logChannel.send({ embeds: [embed] });

            await interaction.reply({ content: 'Die Verwarnung wurde erfolgreich verkündet.', ephemeral: true });
        } catch (error) {
            console.error('Fehler beim Ausführen des Befehls:', error);
            await interaction.reply({ content: 'Es gab ein Problem beim Ausführen des Befehls.', ephemeral: true });
        }
    },
};