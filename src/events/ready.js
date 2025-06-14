const { ActivityType } = require('discord.js');
const { logSuccess, logError, logInfo } = require('../utils/logger');
const registerCommands = require('./registerCommands');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            console.clear();
            logSuccess(`${client.user.tag} is online and ready!`);

            logInfo('Registering application (/) commands...');
            await registerCommands(client);
            logSuccess('Application (/) commands registered successfully!');

            const statuses = [
                { name: 'through the matrix', type: ActivityType.Watching },
                { name: 'with your feelings', type: ActivityType.Playing },
                { name: 'in your life', type: ActivityType.Competing },
                { name: 'with your data', type: ActivityType.Playing },
                { name: 'with your cloud', type: ActivityType.Playing },
                { name: 'to the master server', type: ActivityType.Watching },
            ];

            const statusTypes = ['online'];

            function updateStatus() {
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                const randomPresence = statusTypes[Math.floor(Math.random() * statusTypes.length)];

                client.user.setPresence({
                    activities: [{ name: randomStatus.name, type: randomStatus.type }],
                    status: randomPresence,
                });
            }

            setInterval(updateStatus, 10000); // Update status every 10 seconds
            updateStatus();

            logInfo('Status update system initialized successfully.');
        } catch (error) {
            logError(`An error occurred: ${error.message}`);
        }
    },
};