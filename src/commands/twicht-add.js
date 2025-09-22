const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const twitchDataPath = path.join(__dirname, '../database/twitchData.json');
function readTwitchData() {
    if (!fs.existsSync(twitchDataPath)) {
        fs.writeFileSync(twitchDataPath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(twitchDataPath, 'utf8'));
}
function saveTwitchData(data) {
    fs.writeFileSync(twitchDataPath, JSON.stringify(data, null, 2));
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('twitch-add')
        .setDescription('Füge einen Twitch-Streamer hinzu.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Der Twitch-Benutzername des Streamers.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Der Discord-Kanal, in dem Benachrichtigungen gesendet werden sollen.')
                .setRequired(true)),
    async execute(interaction) {
        const username = interaction.options.getString('username');
        const channelId = interaction.options.getChannel('channel').id;
        const twitchData = readTwitchData();
        if (twitchData.some(entry => entry.username === username)) {
            return interaction.reply({ content: `Der Streamer \`${username}\` ist bereits hinzugefügt.`, ephemeral: true });
        }
        twitchData.push({ username, channelId });
        saveTwitchData(twitchData);
        interaction.reply({ content: `Der Streamer \`${username}\` wurde erfolgreich hinzugefügt.`, ephemeral: true });
    },
};
