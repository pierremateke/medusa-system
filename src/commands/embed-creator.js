const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-embed')
        .setDescription('» Create a custom embed.')
        .addStringOption(option =>
            option
                .setName('title')
                .setDescription('The title of the embed.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('The description of the embed. Use ";" for line breaks.')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel where the embed should be sent.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('color')
                .setDescription('The color of the embed (hex code, e.g., #FFFFFF).')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('footer')
                .setDescription('The footer text of the embed.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('footer-url')
                .setDescription('The URL for the footer icon.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('author')
                .setDescription('The author text of the embed.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('author-url')
                .setDescription('The URL for the author icon.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('image')
                .setDescription('The URL of an image to include in the embed.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('thumbnail')
                .setDescription('The URL of a thumbnail to include in the embed.')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('timestamp')
                .setDescription('Whether to include a timestamp in the embed (true/false).')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), 
    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: 'You do not have permission to use this command. Administrator permissions are required.',
                    ephemeral: true,
                });
            }
            const title = interaction.options.getString('title');
            let description = interaction.options.getString('description');
            const color = interaction.options.getString('color') || '#FFFFFF';
            const footer = interaction.options.getString('footer');
            const footerUrl = interaction.options.getString('footer-url');
            const author = interaction.options.getString('author');
            const authorUrl = interaction.options.getString('author-url');
            const image = interaction.options.getString('image');
            const thumbnail = interaction.options.getString('thumbnail');
            const targetChannel = interaction.options.getChannel('channel');
            const includeTimestamp = interaction.options.getBoolean('timestamp');
            if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                return interaction.reply({
                    content: 'The specified channel is invalid or not a text channel.',
                    ephemeral: true,
                });
            }
            description = description.replace(/;/g, '\n');
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color);
            if (footer) {
                embed.setFooter({
                    text: footer,
                    iconURL: footerUrl || null,
                });
            }
            if (author) {
                embed.setAuthor({
                    name: author,
                    iconURL: authorUrl || null,
                });
            }
            if (image) embed.setImage(image);
            if (thumbnail) embed.setThumbnail(thumbnail);
            if (includeTimestamp) {
                embed.setTimestamp();
            }
            await targetChannel.send({ embeds: [embed] });
            await interaction.reply({
                content: `Embed successfully sent to <#${targetChannel.id}>.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(`An error occurred while executing the embed-creator command: ${error.message}`);
            await interaction.reply({
                content: 'An error occurred while trying to create the embed.',
                ephemeral: true,
            });
        }
    },
};