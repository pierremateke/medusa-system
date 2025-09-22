const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json'); 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('» Displays the latency.'),
    async execute(interaction) {
        const calculateLatencies = async (createdTimestamp) => {
            const latency = Date.now() - createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);
            return { latency, apiLatency };
        };
        const { latency, apiLatency } = await calculateLatencies(interaction.createdTimestamp);
        const embed = new EmbedBuilder()
            .setColor(config.embedSettings.mainColor)
            .setTitle('Information')
            .setDescription('Here are the latency details:')
            .addFields(
                { name: 'Bot ', value: `\`${latency}ms\``, inline: true },
                { name: 'API ', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
            .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
        const refreshButton = new ButtonBuilder()
            .setCustomId('refresh_ping')
            .setLabel('Ping again..')
            .setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder().addComponents(refreshButton);
        await interaction.reply({ embeds: [embed], components: [row] });
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === 'refresh_ping' && i.user.id === interaction.user.id,
            time: 300000, 
        });
        collector.on('collect', async i => {
            if (i.customId === 'refresh_ping') {
                const { latency, apiLatency } = await calculateLatencies(i.createdTimestamp);
                const updatedEmbed = new EmbedBuilder()
                    .setColor(config.embedSettings.mainColor)
                    .setTitle('Information')
                    .setDescription('Here are the updated latency details:')
                    .addFields(
                        { name: 'Bot ', value: `\`${latency}ms\``, inline: true },
                        { name: 'API ', value: `\`${apiLatency}ms\``, inline: true }
                    )
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
                await i.update({ embeds: [updatedEmbed] });
            }
        });
        collector.on('end', () => {
            interaction.editReply({ components: [] });
        });
    },
};