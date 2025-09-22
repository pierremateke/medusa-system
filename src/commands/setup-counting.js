const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const countingDataPath = path.join(__dirname, '../database/countingData.json');
function readCountingData() {
    if (!fs.existsSync(countingDataPath)) {
        fs.writeFileSync(countingDataPath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(countingDataPath, 'utf8'));
}
function saveCountingData(data) {
    fs.writeFileSync(countingDataPath, JSON.stringify(data, null, 2));
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-counting')
        .setDescription('Richte das Counting-Spiel in einem Kanal ein.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Der Kanal, in dem das Counting-Spiel stattfinden soll.')
                .setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const countingData = readCountingData();
        countingData[channel.id] = { currentNumber: 0, lastUserId: null };
        saveCountingData(countingData);
        const embed = new EmbedBuilder()
            .setColor('#2d8804')
            .setTitle('COUNTING')
            .setDescription(
                `Das Counting-Spiel wurde in <#${channel.id}> gestartet!\n\n` +
                `**Regeln:**\n` +
                `- Schreibe die nächste Zahl in der Reihenfolge.\n` +
                `- Zwei Nachrichten hintereinander vom gleichen Benutzer sind nicht erlaubt.\n` +
                `- Wenn jemand die falsche Zahl schreibt, wird die Nachricht gelöscht.\n\n` +
                `Viel Spaß beim Spielen!`
            )
            .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
            .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });
        const embedMessage = await channel.send({ embeds: [embed] });
        await embedMessage.pin();
        await interaction.reply({ content: `Das Counting-Spiel wurde erfolgreich in <#${channel.id}> eingerichtet.`, ephemeral: true });
    },
};