const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json'); // Importiere die config.json-Datei

// IDs direkt im Code angeben
const ADMIN_ROLE_ID = '1380000149371359254'; // Ersetze durch die ID der Admin-Rolle
const LOG_CHANNEL_ID = '1380000369177792592'; // Ersetze durch die ID des Log-Kanals

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team-uprank')
        .setDescription('» Teamupdate für ein Uprank erstellen.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Das Teammitglied, das befördert wird.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('von')
                .setDescription('Die alte Rolle des Teammitglieds.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('auf')
                .setDescription('Die neue Rolle des Teammitglieds.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Grund')
                .setRequired(true)),
    async execute(interaction) {
        try {
            // Überprüfen, ob der Benutzer die Admin-Rolle hat
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return await interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl auszuführen.', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');
            const oldRole = interaction.options.getRole('von');
            const newRole = interaction.options.getRole('auf');
            const reason = interaction.options.getString('grund');

            const member = await interaction.guild.members.fetch(targetUser.id);
            if (!member) {
                return await interaction.reply({ content: 'Das Mitglied konnte nicht gefunden werden.', ephemeral: true });
            }

            // Rolle entfernen und neue Rolle geben
            await member.roles.remove(oldRole);
            await member.roles.add(newRole);

            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (!logChannel) {
                return await interaction.reply({ content: 'Der Log-Kanal konnte nicht gefunden werden.', ephemeral: true });
            }

            const nowUnix = Math.floor(Date.now() / 1000);

            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.successColor)
                .setTitle('UPRANK')
                .setDescription(
                    `**${targetUser}** wurde im Team befördert!\n\n` +
                    `**Von:** <@&${oldRole.id}>\n` +
                    `**Auf:** <@&${newRole.id}>\n` +
                    `**Grund:** \`${reason}\`\n` +
                    `**Am:** <t:${nowUnix}:f>\n\n` +
                    `Mit freundlichen Grüßen,\n<@${interaction.user.id}>`
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

            await logChannel.send({ embeds: [embed] });

            await interaction.reply({ content: 'Die Beförderung wurde erfolgreich verkündet und die Rollen wurden angepasst.', ephemeral: true });
        } catch (error) {
            console.error('Fehler beim Ausführen des Befehls:', error);
            await interaction.reply({ content: 'Es gab ein Problem beim Ausführen des Befehls.', ephemeral: true });
        }
    },
};