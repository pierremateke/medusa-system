const chalk = require('chalk');

const logSuccess = (message) => console.log(chalk.green('[SUCCESS]'), chalk.white(message));
const logError = (message) => console.error(chalk.red('[ERROR]'), chalk.white(message));
const logWarning = (message) => console.warn(chalk.yellow('[WARNING]'), chalk.white(message));
const logInfo = (message) => console.log(chalk.blue('[INFO]'), chalk.white(message));

module.exports = { logSuccess, logError, logWarning, logInfo };