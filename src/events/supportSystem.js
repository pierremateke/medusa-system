module.exports = async function (client) {
    const targetChannelId = '1380000252982984854'; 
    const guild = client.guilds.cache.find(guild => guild.channels.cache.has(targetChannelId));
    if (!guild) {
        console.error('❌ Guild mit dem Voice-Channel wurde nicht gefunden.');
        return;
    }
    const channel = guild.channels.cache.get(targetChannelId);
    if (!channel || channel.type !== 2) {
        console.error('❌ Channel nicht gefunden oder ist kein Voice-Channel.');
        return;
    }
    const originalNicknames = new Map(); 
    const enteredOrder = []; 
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;
        const joined = newState.channelId === targetChannelId && oldState.channelId !== targetChannelId;
        const left = oldState.channelId === targetChannelId && newState.channelId !== targetChannelId;
        if (joined) {
            if (!originalNicknames.has(member.id)) {
                originalNicknames.set(member.id, member.nickname || member.user.username);
            }
            if (!enteredOrder.includes(member.id)) {
                enteredOrder.push(member.id);
            }
            await updateNicknames(channel, enteredOrder, originalNicknames);
        }
        if (left) {
            const originalName = originalNicknames.get(member.id);
            if (originalName) {
                try {
                    await member.setNickname(originalName);
                } catch (err) {
                    console.error(`Fehler beim Zurücksetzen des Nicknamens von ${member.user.tag}:`, err.message);
                }
                originalNicknames.delete(member.id);
            }
            const index = enteredOrder.indexOf(member.id);
            if (index > -1) enteredOrder.splice(index, 1);
            await updateNicknames(channel, enteredOrder, originalNicknames);
        }
    });
};
async function updateNicknames(channel, enteredOrder, originalNicknames) {
    for (let i = 0; i < enteredOrder.length; i++) {
        const memberId = enteredOrder[i];
        const member = channel.guild.members.cache.get(memberId);
        if (!member) continue;
        const baseName = originalNicknames.get(memberId) || member.user.username;
        const numberedName = `[${i + 1}] ${baseName}`;
        if (member.nickname !== numberedName) {
            try {
                await member.setNickname(numberedName);
            } catch (err) {
                console.error(`Fehler beim Setzen des Nicknamens für ${member.user.tag}:`, err.message);
            }
        }
    }
}
