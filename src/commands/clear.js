const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json'); // Importiere die config.json-Datei
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('» Deletes a specified number of messages.')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('The number of messages to delete (1-100).')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const logChannelId = '1381614771006214155';

        if (amount < 1 || amount > 100) {
            return interaction.reply({
                content: 'Please provide a number between 1 and 100.',
                ephemeral: true,
            });
        }

        try {
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: amount });
            const deletedMessages = await interaction.channel.bulkDelete(fetchedMessages, true);

            if (deletedMessages.size === 0) {
                return interaction.reply({
                    content: 'No messages could be deleted. Messages older than 14 days cannot be deleted.',
                    ephemeral: true,
                });
            }

            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (!logChannel) {
                return interaction.reply({
                    content: 'Log channel not found. Please check the configuration.',
                    ephemeral: true,
                });
            }

            const logFilePath = path.join(__dirname, `deleted_messages_${Date.now()}.txt`);
            const logContent = deletedMessages.map(msg => `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content || 'Embed/Attachment'}`).join('\n');

            fs.writeFileSync(logFilePath, logContent);

            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.successColor)
                .setTitle('Moderation - Logging')
                .setDescription(`**${deletedMessages.size} messages** were deleted in ${interaction.channel}.`)
                .addFields(
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Channel', value: `${interaction.channel}`, inline: true },
                    { name: 'Amount', value: `${deletedMessages.size}`, inline: true }
                )
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

            await logChannel.send({
                content: 'Here is the log of deleted messages:',
                embeds: [embed],
                files: [logFilePath],
            });

            fs.unlinkSync(logFilePath); // Lösche die Datei nach dem Senden

            await interaction.reply({
                content: `Successfully deleted **${deletedMessages.size} messages**.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error deleting messages:', error);
            await interaction.reply({
                content: 'An error occurred while trying to delete messages.',
                ephemeral: true,
            });
        }
    },
};