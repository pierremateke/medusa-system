const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json'); // Importiere die config.json-Datei

// IDs direkt im Code angeben
const ADMIN_ROLE_ID = '1380000149371359254'; // Ersetze durch die ID der Admin-Rolle
const LOG_CHANNEL_ID = '1380000369177792592'; // Ersetze durch die ID des Log-Kanals

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team-kick')
        .setDescription('» Teamupdate für einen Teamkick erstellen.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Das Teammitglied, das entfernt wird.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('rolle')
                .setDescription('Die Rolle, die das Teammitglied verliert.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Der Grund für den Teamkick.')
                .setRequired(true)),
    async execute(interaction) {
        try {
            // Überprüfen, ob der Benutzer die Admin-Rolle hat
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return await interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl auszuführen.', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');
            const role = interaction.options.getRole('rolle');
            const reason = interaction.options.getString('grund');

            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (!logChannel) {
                return await interaction.reply({ content: 'Der Log-Kanal konnte nicht gefunden werden.', ephemeral: true });
            }

            const nowUnix = Math.floor(Date.now() / 1000);

            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.errorColor)
                .setTitle('KICK')
                .setDescription(
                    `**${targetUser}** wurde aus dem Team entfernt!\n\n` +
 //                   `**Rolle:** <@&${role.id}>\n` +
                    `**Grund:** \`${reason}\`\n` +
                    `**Am:** <t:${nowUnix}:f>\n\n` +
                    `Mit freundlichen Grüßen,\n<@${interaction.user.id}>`
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

            await logChannel.send({ embeds: [embed] });

            await interaction.reply({ content: 'Der Teamkick wurde erfolgreich verkündet.', ephemeral: true });
        } catch (error) {
            console.error('Fehler beim Ausführen des Befehls:', error);
            await interaction.reply({ content: 'Es gab ein Problem beim Ausführen des Befehls.', ephemeral: true });
        }
    },
};