const { Events, PermissionsBitField } = require("discord.js");

const BLACKLISTED_WORDS = [
  "discord.gg/", "invite.me", "porn", "nsfw", "fuck", "shit", "nigger", "niga",
  "http://", "https://", "twitch.tv/", "youtube.com/"
];

const SPAM_TRACKER = new Map();

const MAX_MSG_PER_INTERVAL = 5;
const SPAM_INTERVAL = 10000; // 10 Sekunden
const MUTE_DURATION = 10 * 60 * 1000; // 10 Minuten

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (
      message.author.bot ||
      !message.guild ||
      message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) return;

    const { content, member } = message;
    const lower = content.toLowerCase();

    // ===== BLACKLISTED WORDS / ANTI-AD FILTER =====
    if (BLACKLISTED_WORDS.some(word => lower.includes(word))) {
      await message.delete().catch(() => {});
      await warnOrMute(member, message, "Blacklisted word or ad detected.");
      return;
    }

    // ===== ANTI-EVERYONE / HERE SPAM =====
    if (message.mentions.everyone) {
      await message.delete().catch(() => {});
      await warnOrMute(member, message, "Mass ping detected.");
      return;
    }

    // ===== ANTI-UNICODE SPAM / INVISIBLE CHARACTERS =====
    const invisibleChars = /[\u200B-\u200D\uFEFF]/;
    if (invisibleChars.test(content)) {
      await message.delete().catch(() => {});
      await warnOrMute(member, message, "Invisible character spam.");
      return;
    }

    // ===== SPAM TRACKING =====
    const userId = message.author.id;
    const now = Date.now();
    if (!SPAM_TRACKER.has(userId)) {
      SPAM_TRACKER.set(userId, []);
    }

    const timestamps = SPAM_TRACKER.get(userId).filter(ts => now - ts < SPAM_INTERVAL);
    timestamps.push(now);
    SPAM_TRACKER.set(userId, timestamps);

    if (timestamps.length >= MAX_MSG_PER_INTERVAL) {
      await message.delete().catch(() => {});
      await warnOrMute(member, message, "Spam detected.");
      return;
    }
  }
};

// ===== WARN / MUTE FUNCTION =====
async function warnOrMute(member, message, reason) {
  const muteRole = message.guild.roles.cache.find(role =>
    role.name.toLowerCase().includes("mute")
  );

  if (muteRole) {
    await member.roles.add(muteRole, reason).catch(() => {});
  } else {
    // Create mute role if not exists
    try {
      const newMuteRole = await message.guild.roles.create({
        name: "Muted",
        color: "Grey",
        permissions: []
      });
      message.guild.channels.cache.forEach(channel => {
        channel.permissionOverwrites.create(newMuteRole, {
          SendMessages: false,
          AddReactions: false,
          Speak: false
        });
      });
      await member.roles.add(newMuteRole, reason);
    } catch (e) {
      console.error("Fehler beim Erstellen der Mute-Rolle:", e);
    }
  }

  const logChannel = message.guild.channels.cache.find(ch =>
    ch.name.toLowerCase().includes("modlog")
  );

  if (logChannel) {
    logChannel.send({
      embeds: [{
        title: "🔒 Sicherheitsaktion",
        description: `**User:** ${member}\n**Grund:** ${reason}`,
        color: 0xff0000,
        timestamp: new Date()
      }]
    }).catch(() => {});
  }

  try {
    await member.send(`⚠️ Du wurdest in **${message.guild.name}** gemuted. Grund: ${reason}`);
  } catch (err) {
    console.log("Konnte DM nicht senden.");
  }
}
