const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { logInfo, logSuccess, logError, logWarning } = require('./utils/logger');
const loggingHandler = require('./events/loggingHandler');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
    ],
});
client.commands = new Collection();
const loadEvents = (client) => {
    const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(`./events/${file}`);
        if (event.name && event.execute) {
            if (event.name === 'ready') {
                client.once(event.name, (...args) => event.execute(client, ...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            logInfo(`Loaded event: ${event.name}`);
        } else {
            logWarning(`Failed to load event file: ${file}. Missing "name" or "execute" property.`);
        }
    }
    logInfo('Events loaded successfully.');
};
const loadCommands = (client) => {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                logInfo(`Loaded command: ${command.data.name}`);
            } else {
                logWarning(`Command file "${file}" is missing "data" or "execute" property.`);
            }
        } catch (error) {
            logError(`Failed to load command file "${file}": ${error.message}`);
        }
    }
    logInfo('Commands loaded successfully.');
};
loadEvents(client);
loadCommands(client);
loggingHandler(client);
client.login(config.bot.token);