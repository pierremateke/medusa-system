const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            const teamListConfig = config.teamlistSystem;

            if (!teamListConfig.enabled) return;

            const channelId = teamListConfig.channelId;
            const roleIds = teamListConfig.roleIds;
            const embedTitle = teamListConfig.embedTitle;

            const guild = client.guilds.cache.first();
            if (!guild) return;

            const channel = guild.channels.cache.get(channelId);
            if (!channel) return;

            // Funktion zum Erstellen und Senden/Bearbeiten des Embeds
            const updateTeamEmbed = async () => {
                let description = '';

                for (const roleId of roleIds) {
                    const role = guild.roles.cache.get(roleId);
                    if (!role) continue;

                    // Alle Mitglieder mit dieser Rolle
                    const members = role.members.map(m => `- <@${m.user.id}>`);
                    if (members.length > 0) {
                        description += `**<@&${role.id}>**\n${members.join('\n')}\n\n`;
                    }
                }

                if (description === '') description = '_Aktuell keine Teammitglieder gefunden._';

                const embed = new EmbedBuilder()
                    .setColor(config.embedSettings.mainColor)
                    .setTitle(embedTitle)
                    .setDescription(description)
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

                // Prüfe, ob schon eine Teamliste-Nachricht existiert und bearbeite sie, sonst sende neu
                const messages = await channel.messages.fetch({ limit: 10 });
                const teamMsg = messages.find(msg =>
                    msg.author.id === client.user.id &&
                    msg.embeds.length &&
                    msg.embeds[0].title === embedTitle // Nutze den Titel aus der Config
                );
                if (teamMsg) {
                    await teamMsg.edit({ embeds: [embed] });
                } else {
                    await channel.send({ embeds: [embed] });
                }
            };

            // Initiales Update
            await updateTeamEmbed();

            // Alle 60 Sekunden aktualisieren
            setInterval(updateTeamEmbed, 60000);

        } catch (error) {
            console.error('Fehler beim Posten/Bearbeiten der Teamliste:', error);
        }
    },
};