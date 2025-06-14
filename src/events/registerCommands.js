const { REST, Routes } = require('discord.js');
const fs = require('fs');
const config = require('../config.json'); // Import config
const { logSuccess, logError, logWarning, logInfo } = require('../utils/logger');

module.exports = async function (client) {
    const commands = [];
    const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

    // Load all commands from the commands folder
    for (const file of commandFiles) {
        try {
            const command = require(`../commands/${file}`);
            if (command.data && command.execute) {
                commands.push(command.data.toJSON());
                logInfo(`Loaded command: ${command.data.name}`);
            } else {
                logWarning(`Command file "${file}" is missing "data" or "execute" property.`);
            }
        } catch (error) {
            logError(`Failed to load command file "${file}": ${error.message}`);
        }
    }

    const rest = new REST({ version: '10' }).setToken(config.bot.token); // Use token from config

    try {
        logInfo('Started refreshing application (/) commands.');

        // Fetch existing commands
        const existingCommands = config.bot.guildId // Use guildId from config
            ? await rest.get(Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId)) // Use clientId and guildId from config
            : await rest.get(Routes.applicationCommands(config.bot.clientId)); // Use clientId from config

        // Delete old commands that are not in the current commands list
        for (const command of existingCommands) {
            const isActiveCommand = commands.find(cmd => cmd.name === command.name);
            if (!isActiveCommand) {
                logWarning(`Deleting old command: ${command.name}`);
                if (config.bot.guildId) { // Use guildId from config
                    await rest.delete(Routes.applicationGuildCommand(config.bot.clientId, config.bot.guildId, command.id)); // Use clientId and guildId from config
                } else {
                    await rest.delete(Routes.applicationCommand(config.bot.clientId, command.id)); // Use clientId from config
                }
                logSuccess(`Deleted old command: ${command.name}`);
            }
        }

        // Register new or updated commands
        if (config.bot.guildId) { // Use guildId from config
            await rest.put(
                Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId), // Use clientId and guildId from config
                { body: commands }
            );
            logSuccess('Successfully registered application (/) commands for the guild.');
        } else {
            await rest.put(
                Routes.applicationCommands(config.bot.clientId), // Use clientId from config
                { body: commands }
            );
            logSuccess('Successfully registered global application (/) commands.');
        }
    } catch (error) {
        logError(`Failed to register application (/) commands: ${error.message}`);
    }
};