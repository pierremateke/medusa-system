const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config.json'); // Importiere die Konfigurationsdatei
const supportRoles = [
    '1380000179792380049'
];
const LOG_CHANNEL_ID = '1380000255176736849';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-rename')
        .setDescription('» Rename this ticket channel.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The new channel name')
                .setRequired(true)
        ),
    async execute(interaction) {
        const member = interaction.member;
        if (!member.roles.cache.some(r => supportRoles.includes(r.id))) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const newName = interaction.options.getString('name');
        await interaction.channel.setName(newName);

        const embed = new EmbedBuilder()
            .setColor(config.embedSettings.mainColor)
            .setDescription(`\`\`\`\nTicket renamed to: ${newName}\n\`\`\``);

        const pinned = await interaction.channel.messages.fetchPinned();
        const ticketMsg = pinned.first();

        if (ticketMsg) {
            await ticketMsg.reply({ embeds: [embed] });
        } else {
            await interaction.channel.send({ embeds: [embed] });
        }

        await interaction.reply({ content: 'Done', ephemeral: true });

        // Logging
        try {
            const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.embedSettings.mainColor)
                    .setTitle('Ticket Rename - Logging')
                    .setDescription(`Ticket renamed in <#${interaction.channel.id}> - \`${interaction.channel.name}\``)
                    .addFields([
                        { name: 'Ticket Informationen', value: `Channel: <#${interaction.channel.id}>\nNew Name: \`${newName}\`\nBy: ${interaction.user.tag} (${interaction.user.id})` }
                    ])
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) { // Füge eine Fehlerbehandlung hinzu
            console.error('Fehler beim Senden der Log-Nachricht:', error);
        }
    }
};