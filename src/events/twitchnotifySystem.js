const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config.json');

const twitchDataPath = path.join(__dirname, '../database/twitchData.json');
const twitchClientId = 'coy04825h11qmbljt1jpvvpxvhzgbm'; // Ersetze mit deinem Twitch-Client-ID
const twitchAccessToken = '500wxtoaf2fuh40e369tm21c0ij31t'; // Ersetze mit deinem Twitch-Access-Token

function readTwitchData() {
    if (!fs.existsSync(twitchDataPath)) {
        fs.writeFileSync(twitchDataPath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(twitchDataPath, 'utf8'));
}

const liveAnnounced = new Map();

async function checkStreamerStatus(client) {
    const twitchData = readTwitchData();

    for (const { username, channelId } of twitchData) {
        try {
            const response = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${username}`, {
                headers: {
                    'Client-ID': twitchClientId,
                    'Authorization': `Bearer ${twitchAccessToken}`,
                },
            });

            if (response.data && response.data.data && response.data.data.length > 0) {
                const stream = response.data.data[0];
                const streamUrl = `https://twitch.tv/${username}`;

                if (!liveAnnounced.get(username)) {
                    const embed = new EmbedBuilder()
                        .setColor('#6441a5')
                        .setTitle(`${username} ist gerade live gegangen!`)
                        .setURL(streamUrl)
                        .setDescription(`**Streamtitel:** ${stream.title}\n**Spiel:** ${stream.game_name}`)
                        .setImage(stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'))
                        .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                        .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

                    const channel = await client.channels.fetch(channelId);
                    await channel.send({ embeds: [embed] });

                    liveAnnounced.set(username, true);
                }
            } else {
                console.log(`Der Streamer ${username} ist nicht live.`);
                liveAnnounced.set(username, false);
            }
        } catch (error) {
            console.error(`Fehler beim Abrufen des Status von ${username}:`, error);
        }
    }
}

module.exports = {
    name: 'ready',
    async execute(client) {
        setInterval(() => checkStreamerStatus(client), 60000);
    },
};
