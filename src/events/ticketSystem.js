const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const config = require('../config.json');
const ticketSystem = config.ticketSystem;
function generateTicketId() {
    return '#' + Math.floor(100000 + Math.random() * 900000);
}
function fillPlaceholders(str, data) {
    if (typeof str !== 'string') return str;
    return str.replace(/{(\w+)}/g, (_, key) => data[key] ?? '');
}
function buildEmbed(embedConfig, data) {
    const embed = new EmbedBuilder()
        .setColor(config.embedSettings.mainColor);
    if (embedConfig && embedConfig.title) {
        embed.setTitle(fillPlaceholders(embedConfig.title, data));
    }
    if (embedConfig && embedConfig.description) {
        embed.setDescription(fillPlaceholders(embedConfig.description, data));
    }
    if (embedConfig && embedConfig.fields) {
        embedConfig.fields.forEach(f => {
            embed.addFields({
                name: fillPlaceholders(f.name, data),
                value: fillPlaceholders(f.value, data),
                inline: f.inline ?? false
            });
        });
    }
    if (config.embedSettings && config.embedSettings.authorName) {
        embed.setAuthor({
            name: fillPlaceholders(config.embedSettings.authorName, data),
            iconURL: (config.embedSettings.authorIconURL) || null
        });
    }
    if (config.embedSettings && config.embedSettings.footerText) {
        embed.setFooter({
            text: fillPlaceholders(config.embedSettings.footerText, data),
            iconURL: (config.embedSettings.footerIconURL) || null
        });
    }
    if (embedConfig && embedConfig.image) {
        embed.setImage(fillPlaceholders(embedConfig.image, data));
    }
    if (embedConfig && embedConfig.thumbnail) {
        embed.setThumbnail(fillPlaceholders(embedConfig.thumbnail, data));
    }
    return embed;
}
module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (!ticketSystem.enabled) return;
            if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-category-select') {
                if (interaction.replied || interaction.deferred) {
                    console.warn('The interaction has already been replied to or deferred.');
                    return;
                }
                await interaction.deferReply({ ephemeral: true });
                await handleTicketCreation(interaction);
            }
            if (interaction.isButton()) {
                switch (interaction.customId) {
                    case 'close-ticket':
                        await handleTicketClosure(interaction);
                        break;
                    case 'confirm-close':
                        await handleCloseConfirmation(interaction);
                        break;
                    case 'cancel-close':
                        await interaction.update({
                            content: 'Ticket closure cancelled.',
                            embeds: [],
                            components: []
                        });
                        break;
                    case 'delete-ticket':
                        await handleTicketDelete(interaction);
                        break;
                    case 'reopen-ticket':
                        await handleTicketReopen(interaction);
                        break;
                }
            }
        } catch (error) {
            console.error(`An error occurred in the ticket system: ${error.message}`);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: 'Beim Erstellen des Tickets ist ein Fehler aufgetreten.',
                        ephemeral: true,
                    });
                } catch (replyError) {
                    console.error('Failed to reply to interaction:', replyError);
                }
            } else {
                try {
                    await interaction.editReply({
                        content: 'Beim Erstellen des Tickets ist ein Fehler aufgetreten.',
                        ephemeral: true,
                    });
                } catch (editReplyError) {
                    console.error('Failed to edit reply to interaction:', editReplyError);
                }
            }
        }
    }
};
async function handleTicketCreation(interaction) {
    try {
        const category = interaction.values[0];
        const guild = interaction.guild;
        const member = interaction.member;
        const categoryData = ticketSystem.categories[category];
        if (!categoryData) {
            return interaction.followUp({
                content: ticketSystem.texts.invalidCategory,
                ephemeral: true,
            });
        }
        const ticketId = generateTicketId();
        const channelName = `ticket-${member.user.username.toLowerCase()}`;
        const existingChannel = guild.channels.cache.find(
            channel => channel.name.startsWith(`ticket-${member.user.username.toLowerCase()}`) && channel.type === ChannelType.GuildText && channel.topic && channel.topic.includes(member.id)
        );
        if (existingChannel) {
            return interaction.followUp({
                content: `You already have a ticket: <#${existingChannel.id}>`,
                ephemeral: true,
            });
        }
        const permissionOverwrites = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: member.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
            },
        ];
        categoryData.roles.forEach(roleId => {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageChannels],
            });
        });
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryData.id,
            topic: `${member.id}|${ticketId}`,
            permissionOverwrites,
        });
        await ticketChannel.setRateLimitPerUser(5);
        const embed = buildEmbed(
            ticketSystem.embeds.ticketCreate,
            {
                category: categoryData.label,
                ticketId,
                user: `${member}`,
                created: `<t:${Math.floor(Date.now() / 1000)}:R>`
            }
        );
        const closeButton = new ButtonBuilder()
            .setCustomId('close-ticket')
            .setLabel('Schließen')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder().addComponents(closeButton);
        const welcomeMsg = await ticketChannel.send({
            content: `${member}`,
            embeds: [embed],
            components: [row]
        });
        await welcomeMsg.pin();
        const logChannel = guild.channels.cache.get(ticketSystem.logChannelId);
        if (logChannel) {
            const logEmbed = buildEmbed(
                ticketSystem.embeds.ticketLogCreate,
                {
                    channelId: ticketChannel.id,
                    channelName,
                    ticketId,
                    category: categoryData.label,
                    user: `${member}`,
                    userTag: member.user.tag
                }
            );
            await logChannel.send({ embeds: [logEmbed] });
        }
        await interaction.followUp({
            content: ticketSystem.texts.ticketCreated.replace('{channelId}', ticketChannel.id),
            ephemeral: true,
        });
    } catch (error) {
        console.error('Failed to handle ticket creation:', error);
        await interaction.followUp({
            content: 'Failed to create ticket. Please try again later.',
            ephemeral: true,
        });
    }
}
async function handleTicketClosure(interaction) {
    try {
        const channel = interaction.channel;
        const pinnedMessages = await channel.messages.fetchPinned();
        const ticketMessage = pinnedMessages.first();
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm-close')
                .setLabel('Schließen')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel-close')
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Secondary)
        );
        if (ticketMessage) {
            await ticketMessage.reply({
                content: ticketSystem.texts.confirmClose,
                components: [confirmRow]
            });
        } else {
            await channel.send({
                content: ticketSystem.texts.confirmClose,
                components: [confirmRow]
            });
        }
        await interaction.deferUpdate();
    } catch (error) {
        console.error('Failed to handle ticket closure:', error);
        await interaction.reply({
            content: 'Failed to handle ticket closure. Please try again later.',
            ephemeral: true,
        });
    }
}
async function handleCloseConfirmation(interaction) {
    try {
        const channel = interaction.channel;
        const guild = interaction.guild;
        const closer = interaction.member;
        const [creatorId, ticketId] = (channel.topic || '').split('|');
        await channel.permissionOverwrites.edit(creatorId, {
            ViewChannel: false
        });
        await channel.setName(`closed-${channel.name.replace('ticket-', '')}`);
        const transcript = await createTranscript(channel, {
            limit: -1,
            fileName: `${channel.name}-transcript.html`,
            poweredBy: false
        });
        const logChannel = guild.channels.cache.get(ticketSystem.logChannelId);
        if (logChannel) {
            try {
                await logChannel.send({
                    content: `Transcript für Ticket ${ticketId || ''} (${channel.name}):`,
                    files: [transcript]
                });
                const logEmbed = buildEmbed(
                    ticketSystem.embeds.ticketLogClose,
                    {
                        ticketId: ticketId || '-',
                        closer: `${closer}`,
                        closerTag: closer.user.tag,
                        channelId: channel.id
                    }
                );
                await logChannel.send({ embeds: [logEmbed] });
            } catch (logError) {
                console.error('Failed to send log message:', logError);
            }
        }
        const closedEmbed = buildEmbed(
            ticketSystem.embeds.ticketClose,
            {
                closer: `${closer}`,
                ticketId: ticketId || '-'
            }
        );
        const controlsEmbed = new EmbedBuilder()
            .setColor(config.embedSettings.mainColor)
            .setDescription('```\nStaff Team Ticket Controls\n```');
        const controlButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('delete-ticket')
                .setLabel('Löschen')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('reopen-ticket')
                .setLabel('Wieder öffnen')
                .setStyle(ButtonStyle.Success)
        );
        await channel.send({ embeds: [closedEmbed] });
        await channel.send({ embeds: [controlsEmbed], components: [controlButtons] });
        try {
            const creator = await guild.members.fetch(creatorId);
            await creator.send({
                embeds: [
                    buildEmbed(
                        ticketSystem.embeds.ticketClose,
                        {
                            closer: `${closer}`,
                            ticketId: ticketId || '-'
                        }
                    )
                ]
            });
        } catch (error) {
        }
        await interaction.deferUpdate();
    } catch (error) {
        console.error('Failed to handle close confirmation:', error);
        await interaction.reply({
            content: 'Failed to handle close confirmation. Please try again later.',
            ephemeral: true,
        });
    }
}
async function handleTicketDelete(interaction) {
    try {
        if (!interaction.member.roles.cache.some(role =>
            ticketSystem.categories.support.roles.includes(role.id))) {
            return interaction.reply({
                content: ticketSystem.texts.noPermissions,
                ephemeral: true
            });
        }
        const channel = interaction.channel;
        const guild = interaction.guild;
        const logChannel = guild.channels.cache.get(ticketSystem.logChannelId);
        if (logChannel) {
            const logEmbed = buildEmbed(
                ticketSystem.embeds.ticketLogDelete,
                {
                    channelId: channel.id,
                    channelName: channel.name,
                    userTag: interaction.user.tag,
                    userId: interaction.user.id
                }
            );
            await logChannel.send({ embeds: [logEmbed] });
        }
        if (interaction.replied || interaction.deferred) {
            console.warn('The interaction has already been replied to or deferred.');
            return;
        }
        await interaction.reply({ content: ticketSystem.texts.ticketDeleting, ephemeral: true });
        setTimeout(() => interaction.channel.delete(), 5000);
    } catch (error) {
        console.error('Failed to handle ticket deletion:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'Failed to handle ticket deletion. Please try again later.',
                ephemeral: true,
            });
        }
    }
}
async function handleTicketReopen(interaction) {
    try {
        const channel = interaction.channel;
        const creatorId = (channel.topic || '').split('|')[0];
        const guild = interaction.guild;
        await channel.permissionOverwrites.edit(creatorId, {
            ViewChannel: true,
            SendMessages: true
        });
        await channel.setName(channel.name.replace('closed-', 'ticket-'));
        if (interaction.replied || interaction.deferred) {
            console.warn('The interaction has already been replied to or deferred.');
            return;
        }
        await interaction.reply({ content: ticketSystem.texts.ticketReopened, ephemeral: true });
        const logChannel = guild.channels.cache.get(ticketSystem.logChannelId);
        if (logChannel) {
            const logEmbed = buildEmbed(
                ticketSystem.embeds.ticketLogReopen,
                {
                    channelId: channel.id,
                    channelName: channel.name,
                    userTag: interaction.user.tag,
                    userId: interaction.user.id
                }
            );
            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (error) {
        console.error('Failed to handle ticket reopen:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'Failed to handle ticket reopen. Please try again later.',
                ephemeral: true,
            });
        }
    }
}