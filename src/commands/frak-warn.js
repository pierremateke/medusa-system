const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const ADMIN_ROLE_ID = '1380000149371359254'; 
const LOG_CHANNEL_ID = '1380000306859085845'; 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('frak-warn')
        .setDescription('» Verwarnung für eine Fraktion aussprechen.')
        .addStringOption(option =>
            option.setName('fraktion')
                .setDescription('Der Name der Fraktion, die verwarnt wird.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('warnstufe')
                .setDescription('Die Verwarnungsstufe (1, 2 oder 3).')
                .setRequired(true)
                .addChoices(
                    { name: '1', value: 1 },
                    { name: '2', value: 2 },
                    { name: '3', value: 3 }
                ))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Der Grund für die Verwarnung.')
                .setRequired(true)),
    async execute(interaction) {
        try {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return await interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl auszuführen.', ephemeral: true });
            }
            const fraktion = interaction.options.getString('fraktion');
            const warnstufe = interaction.options.getInteger('warnstufe');
            const reason = interaction.options.getString('grund');
            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (!logChannel) {
                return await interaction.reply({ content: 'Der Log-Kanal konnte nicht gefunden werden.', ephemeral: true });
            }
            const nowUnix = Math.floor(Date.now() / 1000);
            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.warningColor)
                .setTitle('VERWARNUNG')
                .setDescription(
                    `Die Fraktion **${fraktion}** erhält hiermit einen Fraktions Warn!\n\n` +
                    `**Stufe:** ${warnstufe}\n` +
                    `**Grund:** \`${reason}\`\n` +
                    `**Am:** <t:${nowUnix}:f>\n\n` +
                    `Mit freundlichen Grüßen,\n<@${interaction.user.id}>`
                )
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
            await logChannel.send({ embeds: [embed] });
            await interaction.reply({ content: 'Die Verwarnung wurde erfolgreich verkündet.', ephemeral: true });
        } catch (error) {
            console.error('Fehler beim Ausführen des Befehls:', error);
            await interaction.reply({ content: 'Es gab ein Problem beim Ausführen des Befehls.', ephemeral: true });
        }
    },
};