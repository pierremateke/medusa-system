const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../config.json');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('» Sende ein zufälliges Meme.'),
    async execute(interaction) {
        try {
            const response = await axios.get('https://meme-api.com/gimme');
            const meme = response.data;

            if (!meme || !meme.url) {
                return interaction.reply({
                    content: 'Could not fetch a meme at the moment. Please try again later.',
                    ephemeral: true,
                });
            }

            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.mainColor)
                .setTitle(meme.title)
                .setURL(meme.postLink)
                .setImage(meme.url)
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`Error fetching meme: ${error.message}`);
            await interaction.reply({
                content: 'An error occurred while fetching a meme. Please try again later.',
                ephemeral: true,
            });
        }
    },
};