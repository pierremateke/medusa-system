const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ms = require('ms');
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

async function handleGiveawayJoin(interaction, giveaway) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== `giveaway_join_${giveaway.id}`) return;

    const userId = interaction.user.id;
    const giveawayId = giveaway.id.slice(0, 8);

    if (giveaway.participants.includes(userId)) {
        giveaway.participants = giveaway.participants.filter(id => id !== userId);
        await interaction.reply({ content: `Du hast das Giveaway \`#${giveawayId}\` **verlassen**`, ephemeral: true });
    } else {
        giveaway.participants.push(userId);
        await interaction.reply({ content: `Du bist dem Giveaway \`#${giveawayId}\` **beigetreten**`, ephemeral: true });
    }

    // Add a role to the user upon joining (optional)
    if (config.giveawaySettings && config.giveawaySettings.joinRole) {
        try {
            const role = await interaction.guild.roles.fetch(config.giveawaySettings.joinRole);
            if (role) {
                await interaction.member.roles.add(role);
                console.log(`Added role ${role.name} to ${interaction.user.tag}`);
            } else {
                console.log(`Role ${config.giveawaySettings.joinRole} not found.`);
            }
        } catch (error) {
            console.error("Failed to add role:", error);
        }
    }

    return true; // Signal, dass Änderungen vorgenommen wurden
}

async function updateGiveawayEmbed(client, giveaway) {
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        if (!channel) return console.log(`Channel not found: ${giveaway.channelId}`);

        const message = await channel.messages.fetch(giveaway.messageId);
        if (!message) return console.log(`Message not found: ${giveaway.messageId}`);

        const embed = EmbedBuilder.from(message.embeds[0]);

        const joinButton = new ButtonBuilder()
            .setCustomId(`giveaway_join_${giveaway.id}`)
            .setLabel('🎉')
            .setStyle(ButtonStyle.Success);

        const participantsButton = new ButtonBuilder()
            .setCustomId('participants_count')
            .setLabel(`${giveaway.participants.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const row = new ActionRowBuilder()
            .addComponents(joinButton, participantsButton);

        await message.edit({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Failed to update giveaway embed:', error);
    }
}

async function checkGiveaways(client) {
    let giveaways = readGiveaways();
    let changed = false;

    for (const giveaway of giveaways.filter(g => !g.ended && g.endTime <= Date.now())) {
        giveaway.ended = true;
        changed = true;

        const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) continue;

        let winner = null;
        if (giveaway.participants.length > 0) {
            const winnerIndex = Math.floor(Math.random() * giveaway.participants.length);
            winner = giveaway.participants[winnerIndex];
        }

        const embed = new EmbedBuilder()
            .setColor('#FF0000') // Red color for ended giveaway
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
                await msg.edit({ embeds: [embed], components: [] }); // Remove buttons
            }
        } catch (error) {
            console.error("Failed to edit giveaway message:", error);
        }

        if (winner) {
            await channel.send({ content: `Glückwunsch <@${winner}>, du hast das Giveaway \`${giveaway.id.slice(0, 8)}\` gewonnen!` });
        } else {
            await channel.send({ content: `Das Giveaway \`${giveaway.id.slice(0, 8)}\` ist beendet, aber es gab keine Teilnehmer.` });
        }

        // Remove role from participants after the giveaway ends (optional)
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
                } else {
                    console.log(`Role ${config.giveawaySettings.joinRole} not found.`);
                }
            } catch (error) {
                console.error("Failed to remove role:", error);
            }
        }
    }

    if (changed) saveGiveaways(giveaways);
}

async function createGiveaway(interaction, zeit, preis, anzahl, beschreibung, regeln) {
    const endTime = Date.now() + ms(zeit);
    if (isNaN(endTime)) {
        await interaction.reply({ content: 'Ungültige Zeitangabe.', ephemeral: true });
        return;
    }

    const giveaway = {
        id: Date.now().toString(),
        channelId: interaction.channelId,
        messageId: null,
        preis: preis,
        anzahl: anzahl,
        beschreibung: beschreibung,
        regeln: regeln,
        endTime: endTime,
        participants: [],
        ended: false,
        hostedBy: interaction.user.id
    };

    let giveaways = readGiveaways();
    giveaways.push(giveaway);
    saveGiveaways(giveaways);

    const embed = new EmbedBuilder()
        .setColor(config.embedSettings.mainColor)
        .setTitle(`GIVEAWAY (\`#${giveaway.id.slice(0, 8)}\`)`)
        .setDescription(
            `**Preis:** ${preis}\n` +
            (beschreibung !== 'Keine' ? `**Beschreibung:** ${beschreibung}\n` : '') +
            `**Anzahl:** ${anzahl}\n` +
            `**Hosted by:** <@${giveaway.hostedBy}>\n` +
            `**Endet:** <t:${Math.floor(endTime / 1000)}:R>`
        )
        .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
        .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL })
        .setTimestamp();

    const joinButton = new ButtonBuilder()
        .setCustomId(`giveaway_join_${giveaway.id}`)
        .setLabel('🎉')
        .setStyle(ButtonStyle.Success);

    const participantsButton = new ButtonBuilder()
        .setCustomId('participants_count')
        .setLabel(`0`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const row = new ActionRowBuilder()
        .addComponents(joinButton, participantsButton);

    const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

    giveaway.messageId = msg.id;
    saveGiveaways(giveaways);

    await interaction.reply({ content: `Giveaway gestartet!`, ephemeral: true });
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        let giveaways = readGiveaways();
        let changed = false;

        if (interaction.isCommand()) return;

        for (const giveaway of giveaways) {
            if (!giveaway.ended) {
                const joinResult = await handleGiveawayJoin(interaction, giveaway);
                if (joinResult) {
                    changed = true;
                    await updateGiveawayEmbed(interaction.client, giveaway);
                }
            }
        }

        if (changed) {
            saveGiveaways(giveaways);
        }
    },
    checkGiveaways,
    createGiveaway
};