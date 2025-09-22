const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config.json');
const ticketSystem = config.ticketSystem;
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('» Ticket-System einrichten.')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Der Kanal, in dem das Ticket-Embed gesendet werden soll.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            const targetChannel = interaction.options.getChannel('channel');
            if (!targetChannel) {
                return interaction.reply({
                    content: 'Der angegebene Kanal wurde nicht gefunden.',
                    ephemeral: true,
                });
            }
            await interaction.deferReply({ ephemeral: true });
            const updateEmbed = async () => {
                let categoryLoads = '';
                if (ticketSystem.showLoad) {
                    for (const categoryKey in ticketSystem.categories) {
                        const category = ticketSystem.categories[categoryKey];
                        const ticketCount = targetChannel.guild.channels.cache.filter(c => c.parentId === category.id && c.name.startsWith('ticket-')).size;
                        let loadStatus = ticketSystem.loadEmojis.green;
                        if (ticketCount > 10) loadStatus = ticketSystem.loadEmojis.yellow;
                        if (ticketCount > 15) loadStatus = ticketSystem.loadEmojis.orange;
                        if (ticketCount > 25) loadStatus = ticketSystem.loadEmojis.red;
                        categoryLoads += `\n- ${category.label}: ${loadStatus}`;
                    }
                }
                const embedData = ticketSystem.embeds.setup;
                const embed = new EmbedBuilder()
                    .setColor(config.embedSettings.mainColor)
                    .setTitle(embedData.title)
                    .setDescription(embedData.description.replace('{categoryLoads}', categoryLoads))
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
                    .setImage(embedData.image)
                    .setThumbnail(embedData.thumbnail);
                const selectMenu = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ticket-category-select')
                            .setPlaceholder('Wähle eine Kategorie...')
                            .addOptions(
                                Object.entries(ticketSystem.categories).map(([key, cat]) => ({
                                    label: cat.label,
                                    value: key,
                                    emoji: cat.emoji
                                }))
                            )
                    );
                try {
                    const fetchedMessages = await targetChannel.messages.fetch({ limit: 100 });
                    const botMessage = fetchedMessages.find(msg => msg.author.id === interaction.client.user.id && msg.embeds.length > 0);
                    if (botMessage) {
                        await botMessage.edit({ embeds: [embed], components: [selectMenu] });
                    } else {
                        await targetChannel.send({ embeds: [embed], components: [selectMenu] });
                    }
                } catch (error) {
                    console.error(`Fehler beim Abrufen oder Senden von Nachrichten: ${error}`);
                }
            };
            updateEmbed();
            setInterval(updateEmbed, 60000);
            await interaction.editReply({
                content: `Das Ticket-System wurde erfolgreich in <#${targetChannel.id}> eingerichtet.`,
            });
        } catch (error) {
            console.error(`Beim Einrichten des Ticket-Systems ist ein Fehler aufgetreten: ${error.message}`);
            await interaction.editReply({
                content: 'Beim Einrichten des Ticket-Systems ist ein Fehler aufgetreten.',
            });
        }
    },
};