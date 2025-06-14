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
        .setName('twitch-remove')
        .setDescription('Entferne einen Twitch-Streamer.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Der Twitch-Benutzername des Streamers.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const username = interaction.options.getString('username');

        const twitchData = readTwitchData();

        const index = twitchData.findIndex(entry => entry.username === username);
        if (index === -1) {
            return interaction.reply({ content: `Der Streamer \`${username}\` wurde nicht gefunden.`, ephemeral: true });
        }

        twitchData.splice(index, 1);
        saveTwitchData(twitchData);

        interaction.reply({ content: `Der Streamer \`${username}\` wurde erfolgreich entfernt.`, ephemeral: true });
    },
};
