const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-verify')
        .setDescription('» Verifizierungssystem einrichten.')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Der Kanal, in dem das Verifizierungs-Embed gesendet werden soll.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            const targetChannel = interaction.options.getChannel('channel');
            const verifyConfig = config.verifySystem;
            const embedConfig = verifyConfig.embed;
            if (!targetChannel) {
                return interaction.reply({
                    content: 'Der angegebene Kanal wurde nicht gefunden.',
                    ephemeral: true,
                });
            }
            const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me);
            if (!botPermissions || !botPermissions.has('SendMessages')) {
                return interaction.reply({
                    content: 'Ich habe keine Berechtigung, Nachrichten in diesen Kanal zu senden.',
                    ephemeral: true,
                });
            }
            const dataPath = path.join(__dirname, '../database/verifyData.json');
            let verifyCount = 0;
            if (fs.existsSync(dataPath)) {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                verifyCount = data.verifications || 0;
            }
            const embed = new EmbedBuilder()
                .setColor(config.embedSettings.mainColor)
                .setTitle(embedConfig.title)
                .setDescription(embedConfig.description)
                .setImage(embedConfig.image)
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
            const verifyButton = new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel(verifyConfig.buttonLabel)
                .setStyle('Success');
            const countButton = new ButtonBuilder()
                .setCustomId('verify_count')
                .setLabel(`${verifyCount}`)
                .setStyle('Secondary')
                .setDisabled(true);
            const row = new ActionRowBuilder().addComponents(verifyButton, countButton);
            try {
                await targetChannel.send({ embeds: [embed], components: [row] });
            } catch (error) {
                console.error(`Fehler beim Senden der Nachricht: ${error.message}`);
                return await interaction.reply({
                    content: 'Ich konnte keine Nachricht in den angegebenen Kanal senden. Bitte überprüfe meine Berechtigungen.',
                    ephemeral: true,
                });
            }
            await interaction.reply({
                content: `Das Verifizierungssystem wurde erfolgreich in <#${targetChannel.id}> eingerichtet.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(`Fehler beim Setup der Verifizierung: ${error.message}`);
            await interaction.reply({
                content: 'Beim Einrichten des Verifizierungssystems ist ein Fehler aufgetreten.',
                ephemeral: true,
            });
        }
    },
};