const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const DATA_PATH = path.join(__dirname, '../database/verifyData.json'); // Pfad zur JSON-Datei

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (!interaction.isButton()) return;
            if (interaction.customId !== 'verify_button') return;

            const verifyConfig = config.verifySystem;
            if (!verifyConfig.enabled) return;

            const VERIFIED_ROLE_ID = verifyConfig.verifiedRoleId;
            const BLACKLISTED_SERVER_IDS = verifyConfig.blacklistedServerIds;
            const LOG_CHANNEL_ID = verifyConfig.logChannelId;
            const MIN_ACCOUNT_AGE_DAYS = verifyConfig.minAccountAgeDays;
            const embedConfig = verifyConfig.embed;

            const member = interaction.member;

            // Blacklist-Prüfung
            if (BLACKLISTED_SERVER_IDS.includes(interaction.guild.id)) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedSettings.errorColor)
                    .setTitle('Du kannst dich auf Medusa Roleplay nicht verifizieren, da du auf dem Server (server) bist der auf der Blacklist steht.')
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

                try {
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                } catch (error) {
                    console.error('Failed to reply to interaction:', error);
                }

                await logVerification(interaction, `<@${member.id}> (${member.id}) hat versucht sich zu verifizieren, aber der Server steht auf der Blacklist.`, config.embedSettings.errorColor, embedConfig);
                return;
            }

            // Account-Alter-Prüfung (mind. X Tage alt)
            const minAccountAge = MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000; // X Tage in ms
            const accountAge = Date.now() - member.user.createdAt.getTime();
            if (accountAge < minAccountAge) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedSettings.errorColor)
                    .setTitle('Dein Discord-Account ist zu jung, um dich zu verifizieren.')
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

                try {
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                } catch (error) {
                    console.error('Failed to reply to interaction:', error);
                }

                await logVerification(interaction, `<@${member.id}> (${member.id}) hat versucht sich zu verifizieren, aber der Account ist zu jung.`, config.embedSettings.errorColor, embedConfig);
                return;
            }

            // Bereits verifiziert
            if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedSettings.errorColor)
                    .setTitle('Du bist bereits verifiziert.')
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

                try {
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                } catch (error) {
                    console.error('Failed to reply to interaction:', error);
                }

                await logVerification(interaction, `<@${member.id}> (${member.id}) hat versucht sich zu verifizieren, aber ist bereits verifiziert.`, config.embedSettings.errorColor, embedConfig);
                return;
            }

            // Erfolgreich verifiziert
            try {
                await member.roles.add(VERIFIED_ROLE_ID);

                // Verifizierungszähler aktualisieren
                let verifyData = { verifications: 0 };
                if (fs.existsSync(DATA_PATH)) {
                    verifyData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
                }
                verifyData.verifications = (verifyData.verifications || 0) + 1;
                fs.writeFileSync(DATA_PATH, JSON.stringify(verifyData, null, 2));

                const embed = new EmbedBuilder()
                    .setColor(config.embedSettings.successColor)
                    .setTitle('Du hast dich erfolgreich verifiziert.')
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

                try {
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                } catch (error) {
                    console.error('Failed to reply to interaction:', error);
                }

                await logVerification(interaction, `<@${member.id}> (${member.id}) hat sich erfolgreich verifiziert.`, config.embedSettings.successColor, embedConfig);

                // --- Embed im Verify-Channel aktualisieren ---
                // Channel suchen (ersetze ggf. durch deine Channel-ID)
                const verifyChannel = interaction.channel; // Wenn Button im Verify-Channel gedrückt wurde
                // Alternativ: const verifyChannel = interaction.guild.channels.cache.get('DEINE_VERIFY_CHANNEL_ID');

                if (verifyChannel) {
                    const messages = await verifyChannel.messages.fetch({ limit: 10 });
                    const verifyMsg = messages.find(msg =>
                        msg.author.id === interaction.client.user.id &&
                        msg.components.length &&
                        msg.components[0].components.find(btn => btn.customId === 'verify_button')
                    );
                    if (verifyMsg) {
                        // Embed und Buttons wie im Setup
                        const verifyCount = verifyData.verifications || 0;
                        const setupEmbed = new EmbedBuilder()
                            .setColor(config.embedSettings.mainColor)
                            .setTitle(embedConfig.title)
                            .setDescription(embedConfig.description)
                            .setImage(embedConfig.image)
                            .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                            .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

                        const verifyButton = new ButtonBuilder()
                            .setCustomId('verify_button')
                            .setLabel('Klick hier')
                            .setStyle(ButtonStyle.Success);

                        const countButton = new ButtonBuilder()
                            .setCustomId('verify_count')
                            .setLabel(`${verifyCount}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true);

                        const row = new ActionRowBuilder().addComponents(verifyButton, countButton);

                        try {
                            await verifyMsg.edit({ embeds: [setupEmbed], components: [row] });
                        } catch (error) {
                            console.error('Failed to edit verify message:', error);
                        }
                    }
                }
                // --- Ende Embed aktualisieren ---

            } catch (error) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedSettings.errorColor)
                    .setTitle('Beim Verifizieren ist ein Fehler aufgetreten.')
                    .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
                    .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

                try {
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                } catch (error) {
                    console.error('Failed to reply to interaction:', error);
                }

                await logVerification(interaction, `<@${member.id}> (${member.id}) hat versucht sich zu verifizieren, aber es ist ein Fehler aufgetreten.`, config.embedSettings.errorColor, embedConfig);
            }
        } catch (error) {
            console.error('An error occurred in the verify system:', error);
        }
    },
};

async function logVerification(interaction, message, color, embedConfig) {
    try {
        const verifyConfig = config.verifySystem;
        const LOG_CHANNEL_ID = verifyConfig.logChannelId;

        const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        const member = interaction.member;

        const logEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle('Verifizierung - Logging')
            .setDescription(message)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setAuthor({ name: config.embedSettings.authorName, iconURL: config.embedSettings.authorIconURL })
            .setFooter({ text: config.embedSettings.footerText, iconURL: config.embedSettings.footerIconURL });

        try {
            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
            console.error('Failed to send log message:', error);
        }
    } catch (error) {
        console.error('An error occurred while logging verification:', error);
    }
}