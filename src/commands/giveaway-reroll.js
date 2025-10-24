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
        .setName('giveaway-reroll')
        .setDescription('Rolle einen neuen Gewinner für ein beendetes Giveaway aus.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('giveaway-id')
                .setDescription('Die ID des Giveaways (die ersten 8 Zeichen)')
                .setRequired(true)),
    async execute(interaction) {
        try {
            const giveawayId = interaction.options.getString('giveaway-id');
            const giveaways = readGiveaways();
            
            //=================== FIND GIVEAWAY ===================//
            const giveaway = giveaways.find(g => g.id.startsWith(giveawayId));
            if (!giveaway) {
                await interaction.reply({ content: `Giveaway mit der ID \`${giveawayId}\` nicht gefunden.`, ephemeral: true });
                return;
            }
            
            if (!giveaway.ended) {
                await interaction.reply({ content: `Das Giveaway \`${giveawayId}\` ist noch nicht beendet.`, ephemeral: true });
                return;
            }
            
            if (giveaway.participants.length === 0) {
                await interaction.reply({ content: `Das Giveaway \`${giveawayId}\` hatte keine Teilnehmer.`, ephemeral: true });
                return;
            }
            
            //=================== SELECT NEW WINNER ===================//
            const winnerIndex = Math.floor(Math.random() * giveaway.participants.length);
            const newWinner = giveaway.participants[winnerIndex];
            
            //=================== UPDATE EMBED ===================//
            const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
            if (channel) {
                try {
                    const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                    if (msg) {
                        const embed = EmbedBuilder.from(msg.embeds[0]);
                        embed.setDescription(
                            `**Preis:** ${giveaway.preis}\n` +
                            `**Gewinner:** <@${newWinner}>\n` +
                            `**Teilnehmer:** ${giveaway.participants.length}`
                        );
                        await msg.edit({ embeds: [embed] });
                        
                        //=================== SEND REROLL MESSAGE ===================//
                        await msg.reply({ content: `🎉 **Reroll!** Glückwunsch <@${newWinner}>, du hast das Giveaway \`${giveawayId}\` gewonnen!` });
                    }
                } catch (error) {
                    console.error('Failed to update giveaway message:', error);
                }
            }
            
            await interaction.reply({ content: `Neuer Gewinner für Giveaway \`${giveawayId}\` ausgelost: <@${newWinner}>`, ephemeral: true });
            
        } catch (error) {
            console.error('Failed to reroll giveaway:', error);
            await interaction.reply({ content: 'Fehler beim Reroll. Bitte versuche es erneut.', ephemeral: true });
        }
    },
};
