const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
        .setName('giveaway-delete')
        .setDescription('Lösche ein Giveaway komplett.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('giveaway-id')
                .setDescription('Die ID des Giveaways')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('delete-message')
                .setDescription('Soll die Giveaway-Nachricht gelöscht werden? (Default: true)')
                .setRequired(false)),
    async execute(interaction) {
        try {
            const giveawayId = interaction.options.getString('giveaway-id');
            const deleteMessage = interaction.options.getBoolean('delete-message') ?? true;
            const giveaways = readGiveaways();

            const giveawayIndex = giveaways.findIndex(g => g.id.startsWith(giveawayId));
            if (giveawayIndex === -1) {
                await interaction.reply({ content: `Giveaway mit der ID \`${giveawayId}\` nicht gefunden.`, ephemeral: true });
                return;
            }

            const giveaway = giveaways[giveawayIndex];

            if (deleteMessage) {
                const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
                if (channel) {
                    try {
                        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                        if (msg) {
                            await msg.delete();
                        }
                    } catch (error) {
                        console.error('Failed to delete giveaway message:', error);
                        await interaction.reply({ 
                            content: `Giveaway \`${giveawayId}\` aus der Datenbank entfernt, aber die Nachricht konnte nicht gelöscht werden.`, 
                            ephemeral: true 
                        });
                        return;
                    }
                }
            }

            if (!giveaway.ended && config.giveawaySettings && config.giveawaySettings.joinRole) {
                const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
                if (channel) {
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
            }

            giveaways.splice(giveawayIndex, 1);
            saveGiveaways(giveaways);

            await interaction.reply({ 
                content: `Giveaway \`${giveawayId}\` wurde erfolgreich gelöscht.${deleteMessage ? ' Die Nachricht wurde ebenfalls entfernt.' : ' Die Nachricht blieb erhalten.'}`, 
                ephemeral: true 
            });

        } catch (error) {
            console.error('Failed to delete giveaway:', error);
            await interaction.reply({ content: 'Fehler beim Löschen des Giveaways. Bitte versuche es erneut.', ephemeral: true });
        }
    },
};
