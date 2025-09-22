const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../config.json');
module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const suggestionConfig = config.suggestionSystem;
        if (!suggestionConfig.enabled) return;
        const suggestionChannelId = suggestionConfig.suggestionChannelId;
        const yesEmojiId = suggestionConfig.yesEmojiId;
        const noEmojiId = suggestionConfig.noEmojiId;
        const embedConfig = suggestionConfig.embed;
        if (message.channel.id === suggestionChannelId && message.author.id !== message.client.user.id) {
            try {
                await message.delete();
                const suggestionEmbed = new EmbedBuilder()
                    .setColor(config.embedSettings.mainColor)
                    .setTitle(suggestionConfig.embed.title)
                    .setDescription(`${message.author}: ${message.content}`)
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
                const embedMessage = await message.channel.send({ embeds: [suggestionEmbed] });
                await embedMessage.react(message.guild.emojis.cache.get(yesEmojiId));
                await embedMessage.react(message.guild.emojis.cache.get(noEmojiId));
            } catch (error) {
                console.error('Fehler beim Verarbeiten des Vorschlags:', error);
                message.channel.send({ content: 'Beim Verarbeiten deines Vorschlags ist ein Fehler aufgetreten.', ephemeral: true });
            }
        }
    },
};