const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supportRoles = [
    '1380000179792380049'
];

const scheduledCloses = new Map();
const LOG_CHANNEL_ID = '1380000255176736849';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-autoclose')
        .setDescription('» Automatically close this ticket.')
        .addIntegerOption(option =>
            option.setName('hours')
                .setDescription('Number of hours until the ticket is closed')
                .setMinValue(1)
                .setMaxValue(168)
                .setRequired(true)
        ),
    async execute(interaction) {
        const member = interaction.member;
        if (!member.roles.cache.some(r => supportRoles.includes(r.id))) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const hours = interaction.options.getInteger('hours');
        const channel = interaction.channel;

        // Check if this is a ticket channel (e.g. topic is userId or some ticket marker)
        if (!channel.topic || isNaN(channel.topic)) {
            console.error(`[ticket-autoclose] This channel is not a Ticket: ${channel.id} (${channel.name})`);
            await interaction.reply({ content: 'This channel is not a Ticket', ephemeral: true });
            // Logging
            try {
                const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.embedSettings.mainColor)
                        .setTitle('Ticket Autoclose - Logging')
                        .setDescription(`> Tried to set autoclose in non-ticket channel: <#${channel.id}> - \`${channel.name}\`\nBy: ${interaction.user.tag}`)
                        .addFields([
                            { name: 'Ticket Informationen', value: `Channel: <#${channel.id}>\nName: \`${channel.name}\`\nBy: ${interaction.user.tag} (${interaction.user.id})` }
                        ])
                       .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                       .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch {}
            return;
        }

        // Cancel any existing scheduled close for this channel
        if (scheduledCloses.has(channel.id)) {
            clearTimeout(scheduledCloses.get(channel.id));
            scheduledCloses.delete(channel.id);
        }

        // Listen for any new messages to cancel autoclose
        const messageCollector = channel.createMessageCollector({ time: hours * 60 * 60 * 1000 });
        messageCollector.on('collect', msg => {
            if (!msg.author.bot) {
                if (scheduledCloses.has(channel.id)) {
                    clearTimeout(scheduledCloses.get(channel.id));
                    scheduledCloses.delete(channel.id);
                    messageCollector.stop();
                    channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(config.embedSettings.mainColor)
                                .setTitle('Ticketsystem - Autoclose')
                                .setDescription('Autoclose has been **cancelled** because a message was sent in this ticket.')
                                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL  })
                                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
                        ]
                    });
                    // Logging
                    interaction.guild.channels.fetch(LOG_CHANNEL_ID).then(logChannel => {
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor(config.embedSettings.mainColor)
                                .setTitle('Ticket Autoclose - Logging')
                                .setDescription(`> Autoclose cancelled for <#${channel.id}> - \`${channel.name}\``)
                                .addFields([
                                    { name: 'Ticket Informationen', value: `Channel: <#${channel.id}>\nName: \`${channel.name}\`\nBy: ${interaction.user.tag} (${interaction.user.id})` }
                                ])
                               .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })                            
                               .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
                            logChannel.send({ embeds: [logEmbed] });
                        }
                    }).catch(() => {});
                }
            }
        });

        // Schedule the close
        const ms = hours * 60 * 60 * 1000;
        const timeout = setTimeout(async () => {
            try {
                const fakeInteraction = {
                    channel,
                    guild: interaction.guild,
                    member: interaction.member,
                    customId: 'confirm-close',
                };
                const ticketSystem = require('../events/ticketSystem');
                await ticketSystem.handleCloseConfirmation(fakeInteraction);
                // Logging
                interaction.guild.channels.fetch(LOG_CHANNEL_ID).then(logChannel => {
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(config.embedSettings.mainColor)
                            .setTitle('Ticket Autoclose - Logging')
                            .setDescription(`> Autoclose activated for <#${channel.id}> - \`${channel.name}\``)
                            .addFields([
                                { name: 'Ticket Informationen', value: `Channel: <#${channel.id}>\nName: \`${channel.name}\`\nBy: ${interaction.user.tag} (${interaction.user.id})\nClosed after: ${hours} hour(s)` }
                            ])
                            .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })                            
                            .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
                        logChannel.send({ embeds: [logEmbed] });
                    }
                }).catch(() => {});
            } catch (e) {
                console.error(`[ticket-autoclose] Error while auto-closing the ticket:`, e);
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.embedSettings.errorColor)
                            .setTitle('Ticketsystem - Autoclose')
                            .setDescription('Error while auto-closing the ticket.')
                            .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                            .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
                    ]
                });
                // Logging
                interaction.guild.channels.fetch(LOG_CHANNEL_ID).then(logChannel => {
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(config.embedSettings.mainColor)
                            .setTitle('Ticket Autoclose - Logging')
                            .setDescription(`> Error while auto-closing ticket in <#${channel.id}> - \`${channel.name}\``)
                            .addFields([
                                { name: 'Ticket Informationen', value: `Channel: <#${channel.id}>\nName: \`${channel.name}\`\nBy: ${interaction.user.tag} (${interaction.user.id})\nError: ${e.message}` }
                            ])
                            .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })                            
                            .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
                        logChannel.send({ embeds: [logEmbed] });
                    }
                }).catch(() => {});
            }
            scheduledCloses.delete(channel.id);
            messageCollector.stop();
        }, ms);

        scheduledCloses.set(channel.id, timeout);

        // Find the ticket creator (from channel.topic)
        let creatorMention = `<@${channel.topic}>`;

        // Find the first message (the ticket embed) and reply to it
        let ticketMsg;
        try {
            const messages = await channel.messages.fetch({ limit: 10 });
            ticketMsg = messages.find(msg =>
                msg.author.id === interaction.client.user.id &&
                msg.embeds.length > 0 &&
                msg.embeds[0].title && msg.embeds[0].title.toLowerCase().includes('ticket')
            );
        } catch {
            ticketMsg = null;
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedSettings.mainColor)
            .setTitle('Ticketsystem - Autoclose')
            .setDescription(`This ticket will be automatically closed in **${hours} hour(s)** unless closed manually.\n\n**To cancel:** Just send any message in this ticket!`)
            .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
            .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

        if (ticketMsg) {
            await ticketMsg.reply({ content: creatorMention, embeds: [embed] });
        } else {
            await channel.send({ content: creatorMention, embeds: [embed] });
        }

        await interaction.reply({
            content: `AutoClose is now active for this ticket.`,
            ephemeral: true
        });

        // Logging
        try {
            const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.embedSettings.mainColor)
                    .setTitle('Ticket Autoclose - Logging')
                    .setDescription(`> Autoclose activated for <#${channel.id}> - \`${channel.name}\``)
                    .addFields([
                        { name: 'Ticket Informationen', value: `Channel: <#${channel.id}>\nName: \`${channel.name}\`\nBy: ${interaction.user.tag} (${interaction.user.id})\nCloses after: ${hours} hour(s)` }
                    ])
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch {}
    }
};