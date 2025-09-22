const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json'); 
const ADMIN_ROLE_ID = '1380000149371359254'; 
const LOG_CHANNEL_ID = '1380000369177792592'; 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('team-beitritt')
        .setDescription('» Teamupdate für einen neuen Teambeitritt erstellen.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Das neue Teammitglied.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('rolle')
                .setDescription('Die Rolle, die das neue Teammitglied erhält.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Grund')
                .setRequired(true)),
    async execute(interaction) {
        try {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return await interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl auszuführen.', ephemeral: true });
            }
            const targetUser = interaction.options.getUser('user');
            const role = interaction.options.getRole('rolle');
            const reason = interaction.options.getString('grund');
            const member = await interaction.guild.members.fetch(targetUser.id);
            if (!member) {
                return await interaction.reply({ content: 'Das Mitglied konnte nicht gefunden werden.', ephemeral: true });
            }
            await member.roles.add(role);
            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (!logChannel) {
                return await interaction.reply({ content: 'Der Log-Kanal konnte nicht gefunden werden.', ephemeral: true });
            }
            const nowUnix = Math.floor(Date.now() / 1000);
            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.successColor)
                .setTitle('BEITRITT')
                .setDescription(
                    `**${targetUser}** ist dem Team beigetreten!\n\n` +
                    `**Als:** <@&${role.id}>\n` +
                    `**Grund:** \`${reason}\`\n` +
                    `**Am:** <t:${nowUnix}:f>\n\n` +
                    `Mit freundlichen Grüßen,\n<@${interaction.user.id}>`
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
            await logChannel.send({ embeds: [embed] });
            await interaction.reply({ content: 'Der Teambeitritt wurde erfolgreich verkündet und die Rolle wurde vergeben.', ephemeral: true });
        } catch (error) {
            console.error('Fehler beim Ausführen des Befehls:', error);
            await interaction.reply({ content: 'Es gab ein Problem beim Ausführen des Befehls.', ephemeral: true });
        }
    },
};