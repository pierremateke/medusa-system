const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createGiveaway } = require('../events/giveawaySystem');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-create')
        .setDescription('Erstelle ein neues Giveaway.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('zeit')
                .setDescription('Zeit (z.B. 5 seconds/minutes/hours/...)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('preis')
                .setDescription('Preis')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('anzahl')
                .setDescription('Anzahl')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('beschreibung')
                .setDescription('Beschreibung (für keine Beschreibung einfach "false" schreiben)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('regeln')
                .setDescription('Regeln (für keine Regeln einfach "false" schreiben)')
                .setRequired(false)),
    async execute(interaction) {
        try {
            const zeit = interaction.options.getString('zeit');
            const preis = interaction.options.getString('preis');
            const anzahl = interaction.options.getInteger('anzahl');
            const beschreibung = interaction.options.getString('beschreibung') || 'Keine';
            const regeln = interaction.options.getString('regeln') || 'Keine';
            await createGiveaway(interaction, zeit, preis, anzahl, beschreibung, regeln);
        } catch (error) {
            console.error('Failed to handle giveaway creation:', error);
            await interaction.reply({ content: 'Failed to create giveaway. Please try again.', ephemeral: true });
        }
    },
};