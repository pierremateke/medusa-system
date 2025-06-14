const { Events } = require('discord.js');
const { logError } = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {

            if (!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                await interaction.reply({
                    content: 'Command not found!',
                    ephemeral: true,
                });
                return;
            }

            // Führe den Command aus
            await command.execute(interaction);
        } catch (error) {
            logError(`An error occurred while executing a command: ${error.message}`);

            // Fehlerbehandlung für Interaktionen
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            }
        }
    },
};