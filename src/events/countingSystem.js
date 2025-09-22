const fs = require('fs');
const path = require('path');
const countingDataPath = path.join(__dirname, '../database/countingData.json');
function readCountingData() {
    if (!fs.existsSync(countingDataPath)) {
        fs.writeFileSync(countingDataPath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(countingDataPath, 'utf8'));
}
function saveCountingData(data) {
    fs.writeFileSync(countingDataPath, JSON.stringify(data, null, 2));
}
module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;
        const countingData = readCountingData();
        const channelData = countingData[message.channel.id];
        if (!channelData) return; 
        const currentNumber = channelData.currentNumber + 1;
        if (message.content === currentNumber.toString()) {
            if (message.author.id === channelData.lastUserId) {
                await message.react('<:no:1380617251925004289>');
                const botMessage = await message.reply({ content: `Du kannst nicht zweimal hintereinander zählen!` });  
                setTimeout(() => {
                    message.delete().catch(() => {});
                    botMessage.delete().catch(() => {});
                }, 10000);
                return;
            }
            channelData.currentNumber = currentNumber;
            channelData.lastUserId = message.author.id;
            saveCountingData(countingData);
            await message.react('<:yes:1380617250217791548>');
        } else {
            await message.react('<:no:1380617251925004289>');
            const botMessage = await message.reply({ content: `Du hast die falsche Zahl geschrieben!` });
            setTimeout(() => {
                message.delete().catch(() => {});
                botMessage.delete().catch(() => {});
            }, 10000);
        }
    },
};