const axios = require('axios');
const { logInfo, logError, logWarning, logSuccess } = require('./logger');
const config = require('../config.json');
const { EmbedBuilder } = require('discord.js');

let lastServerStatus = null;
let serverDownNotificationSent = false;
let discordClient = null;
let lastServerCrashCheck = Date.now();
let serverRestartDetected = false;
let processedAnnouncements = new Set();
let scheduledRestartDetected = false;

async function getFiveMServerInfo(serverIp, serverPort) {
    try {
        const response = await axios.get(`http://${serverIp}:${serverPort}/players.json`, {
            timeout: 5000
        });

        const players = response.data;
        const playerCount = Array.isArray(players) ? players.length : 0;

        const infoResponse = await axios.get(`http://${serverIp}:${serverPort}/info.json`, {
            timeout: 5000
        }).catch(() => null);

        let maxPlayers = 32;
        let serverName = 'Medusa Roleplay';

        if (infoResponse && infoResponse.data) {
            maxPlayers = infoResponse.data.vars?.sv_maxClients || 32;
            serverName = infoResponse.data.server || 'Medusa Roleplay';
        }

        return {
            online: true,
            players: playerCount,
            maxPlayers: maxPlayers,
            serverName: serverName,
            ip: serverIp,
            port: serverPort
        };
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return {
                online: false,
                players: 0,
                maxPlayers: 0,
                serverName: 'Medusa Roleplay',
                ip: serverIp,
                port: serverPort
            };
        }
        logError(`Failed to fetch FiveM server info: ${error.message}`);
        return null;
    }
}

async function updateBotStatus(client) {
    if (!config.fivemMonitor.enabled || !config.fivemMonitor.botStatus.enabled) {
        return;
    }

    const serverInfo = await getFiveMServerInfo(
        config.fivemMonitor.serverIp,
        config.fivemMonitor.serverPort
    );

    if (!serverInfo) {
        return;
    }

    const { ActivityType } = require('discord.js');
    
    if (serverInfo.online) {
        const statusText = config.fivemMonitor.botStatus.statusFormat
            .replace('{players}', serverInfo.players)
            .replace('{maxPlayers}', serverInfo.maxPlayers)
            .replace('{serverName}', serverInfo.serverName);

        client.user.setPresence({
            activities: [{ 
                name: statusText, 
                type: ActivityType.Playing 
            }],
            status: 'online',
        });

        serverDownNotificationSent = false;
    } else {
        client.user.setPresence({
            activities: [{ 
                name: 'Server offline', 
                type: ActivityType.Playing 
            }],
            status: 'dnd',
        });
    }
}

async function sendStatusNotification(message, type = 'info') {
    try {
        if (!discordClient) {
            logError('Discord client not initialized.');
            return;
        }

        const channelId = config.fivemMonitor.statusChannelId;
        const channel = await discordClient.channels.fetch(channelId);

        if (!channel) {
            logError(`Status notification channel not found: ${channelId}`);
            return;
        }

        let color = config.embedSettings.mainColor;
        switch (type) {
            case 'warning':
                color = config.embedSettings.warningColor;
                break;
            case 'success':
                color = config.embedSettings.successColor;
                break;
            case 'error':
                color = config.embedSettings.errorColor;
                break;
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: config.embedSettings.authorName,
                iconURL: config.embedSettings.authorIconURL
            })
            .setDescription(message)
            .setColor(color)
            .setFooter({
                text: config.embedSettings.footerText,
                iconURL: config.embedSettings.footerIconURL
            })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        logInfo(`Status notification sent: ${message}`);
    } catch (error) {
        logError(`Failed to send status notification: ${error.message}`);
    }
}

async function monitorRestartAnnouncements() {
    if (!config.fivemMonitor.enabled) {
        return;
    }

    try {
        const serverInfo = await getFiveMServerInfo(
            config.fivemMonitor.serverIp,
            config.fivemMonitor.serverPort
        );

        if (!serverInfo || !serverInfo.online) {
            return;
        }

        const dynamicResponse = await axios.get(`http://${config.fivemMonitor.serverIp}:${config.fivemMonitor.serverPort}/dynamic.json`, {
            timeout: 5000
        }).catch(() => null);

        if (!dynamicResponse || !dynamicResponse.data) {
            return;
        }

        const hostname = dynamicResponse.data.hostname || '';
        const description = dynamicResponse.data.vars?.sv_projectDesc || '';
        const combinedText = `${hostname} ${description}`.toLowerCase();

        const restartPatterns = [
            /restart in (\d+) minute/i,
            /neustart in (\d+) minute/i,
            /reboot in (\d+) minute/i,
            /wird in (\d+) minute.*neugestartet/i,
            /will restart in (\d+) minute/i
        ];

        for (const pattern of restartPatterns) {
            const match = combinedText.match(pattern);
            if (match) {
                const minutes = parseInt(match[1]);
                const restartTimes = [60, 30, 15, 10, 5, 3, 2, 1];
                
                if (restartTimes.includes(minutes)) {
                    const announcementKey = `restart_${minutes}_${Math.floor(Date.now() / 60000)}`;
                    
                    if (!processedAnnouncements.has(announcementKey)) {
                        processedAnnouncements.add(announcementKey);
                        
                        if (processedAnnouncements.size > 100) {
                            const firstKey = processedAnnouncements.values().next().value;
                            processedAnnouncements.delete(firstKey);
                        }

                        await sendStatusNotification(
                            `**Medusa Roleplay** wird in **${minutes} Minute${minutes !== 1 ? 'n' : ''}** neugestartet.`,
                            'warning'
                        );
                        scheduledRestartDetected = true;
                        logInfo(`Restart announcement detected: ${minutes} minutes`);
                    }
                }
                break;
            }
        }
    } catch (error) {
        logError(`Failed to monitor restart announcements: ${error.message}`);
    }
}

async function monitorServerStatus() {
    if (!config.fivemMonitor.enabled) {
        return;
    }

    const serverInfo = await getFiveMServerInfo(
        config.fivemMonitor.serverIp,
        config.fivemMonitor.serverPort
    );

    if (!serverInfo) {
        return;
    }

    if (lastServerStatus === null) {
        lastServerStatus = serverInfo.online;
        return;
    }

    if (lastServerStatus === true && serverInfo.online === false) {
        if (!serverDownNotificationSent) {
            const timeSinceLastCheck = Date.now() - lastServerCrashCheck;
            
            if (timeSinceLastCheck < 60000) {
                await sendStatusNotification(
                    '**Medusa Roleplay** ist abgestürzt!',
                    'error'
                );
            } else {
                if (scheduledRestartDetected) {
                    await sendStatusNotification(
                        '**Medusa Roleplay** wird neu gestartet.',
                        'warning'
                    );
                } else {
                    await sendStatusNotification(
                        '**Medusa Roleplay** wird neu gestartet (admin request).',
                        'warning'
                    );
                }
            }
            
            serverDownNotificationSent = true;
            serverRestartDetected = true;
        }
    }

    if (lastServerStatus === false && serverInfo.online === true) {
        if (serverRestartDetected) {
            await sendStatusNotification(
                '**Medusa Roleplay** ist wieder online!',
                'success'
            );
            serverDownNotificationSent = false;
            serverRestartDetected = false;
            scheduledRestartDetected = false;
        }
    }

    lastServerStatus = serverInfo.online;
    lastServerCrashCheck = Date.now();
}

function startFiveMMonitorSystem(client) {
    if (!config.fivemMonitor.enabled) {
        logWarning('FiveM monitor system is disabled in config.');
        return;
    }

    discordClient = client;

    logInfo('Starting FiveM monitor system...');

    updateBotStatus(client);
    setInterval(() => updateBotStatus(client), config.fivemMonitor.updateInterval);

    monitorServerStatus();
    setInterval(() => monitorServerStatus(), config.fivemMonitor.statusMonitorInterval);

    monitorRestartAnnouncements();
    setInterval(() => monitorRestartAnnouncements(), 15000);

    logSuccess('FiveM monitor system initialized successfully.');
}

module.exports = {
    getFiveMServerInfo,
    updateBotStatus,
    monitorServerStatus,
    monitorRestartAnnouncements,
    startFiveMMonitorSystem,
    sendStatusNotification
};