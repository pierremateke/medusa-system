const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const giveawaysPath = path.join(__dirname, '../database/giveawayData.json');

function readGiveaways() {
    if (!fs.existsSync(giveawaysPath)) {
        fs.writeFileSync(giveawaysPath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(giveawaysPath, 'utf8'));
}

function saveGiveaways(data) {
    fs.writeFileSync(giveawaysPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-end')
        .setDescription('Beende ein laufendes Giveaway manuell.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('giveaway-id')
                .setDescription('Die ID des Giveaways (die ersten 8 Zeichen)')
                .setRequired(true)),
    async execute(interaction) {
        try {
            const giveawayId = interaction.options.getString('giveaway-id');
            const giveaways = readGiveaways();

            const giveaway = giveaways.find(g => g.id.startsWith(giveawayId));
            if (!giveaway) {
                await interaction.reply({ content: `Giveaway mit der ID \`${giveawayId}\` nicht gefunden.`, ephemeral: true });
                return;
            }

            if (giveaway.ended) {
                await interaction.reply({ content: `Das Giveaway \`${giveawayId}\` ist bereits beendet.`, ephemeral: true });
                return;
            }

            giveaway.ended = true;
            giveaway.endTime = Date.now();

            const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
            if (!channel) {
                await interaction.reply({ content: `Channel für Giveaway \`${giveawayId}\` nicht gefunden.`, ephemeral: true });
                return;
            }

            let winner = null;
            if (giveaway.participants.length > 0) {
                const winnerIndex = Math.floor(Math.random() * giveaway.participants.length);
                winner = giveaway.participants[winnerIndex];
            }

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`GIVEAWAY \`#${giveaway.id.slice(0, 8)}\` (Beendet)`)
                .setDescription(
                    `**Preis:** ${giveaway.preis}\n` +
                    (winner ? `**Gewinner:** <@${winner}>\n` : `**Gewinner:** Keiner\n`) +
                    `**Teilnehmer:** ${giveaway.participants.length}`
                )
                .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
                .setTimestamp();

            try {
                const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                if (msg) {
                    await msg.edit({ embeds: [embed], components: [] });

                    if (winner) {
                        await msg.reply({ content: `Glückwunsch <@${winner}>, du hast das Giveaway \`${giveaway.id.slice(0, 8)}\` gewonnen!` });
                    } else {
                        await msg.reply({ content: `Das Giveaway \`${giveaway.id.slice(0, 8)}\` ist beendet, aber es gab keine Teilnehmer.` });
                    }
                }
            } catch (error) {
                console.error("Failed to edit giveaway message:", error);
            }

            if (config.giveawaySettings && config.giveawaySettings.joinRole) {
                try {
                    const role = await channel.guild.roles.fetch(config.giveawaySettings.joinRole);
                    if (role) {
                        for (const participantId of giveaway.participants) {
                            const member = await channel.guild.members.fetch(participantId).catch(() => null);
                            if (member && member.roles.cache.has(role.id)) {
                                await member.roles.remove(role);
                                console.log(`Removed role ${role.name} from ${member.user.tag}`);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to remove role:", error);
                }
            }

            saveGiveaways(giveaways);

            await interaction.reply({
                content: `Giveaway \`${giveawayId}\` wurde manuell beendet.${winner ? ` Gewinner: <@${winner}>` : ' Keine Teilnehmer.'}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Failed to end giveaway:', error);
            await interaction.reply({ content: 'Fehler beim Beenden des Giveaways. Bitte versuche es erneut.', ephemeral: true });
        }
    },
};
