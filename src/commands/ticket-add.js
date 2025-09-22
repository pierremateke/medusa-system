const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supportRoles = [
    '1380000179792380049'
];
const LOG_CHANNEL_ID = '1380000255176736849';
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-add')
        .setDescription('» Add a user to this ticket.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add')
                .setRequired(true)
        ),
    async execute(interaction) {
        const member = interaction.member;
        if (!member.roles.cache.some(r => supportRoles.includes(r.id))) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const channel = interaction.channel;
        await channel.permissionOverwrites.edit(user.id, {
            ViewChannel: true,
            SendMessages: true
        });
        const pinned = await channel.messages.fetchPinned();
        const ticketMsg = pinned.first();
        if (ticketMsg) {
            await ticketMsg.reply({ content: `### ${user} successfully added to the ticket.` });
        } else {
            await channel.send({ content: `${user} successfully added to the ticket.` });
        }
        await interaction.reply({ content: 'Done', ephemeral: true });
        try {
            const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.embedSettings.mainColor)
                    .setTitle('Ticket Add - Logging')
                    .setDescription(`> User added to <#${channel.id}> - \`${channel.name}\``)
                    .addFields([
                        { name: 'Ticket Informationen', value: `Channel: <#${channel.id}>\nName: \`${channel.name}\`\nAdded: ${user.tag} (${user.id})\nBy: ${interaction.user.tag} (${interaction.user.id})` }
                    ])
                   .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                   .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch {}
    }
};