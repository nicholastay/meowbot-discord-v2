import chalk from 'chalk'

import Logging from '../Core/Logging'

let Logger = [
    {
        description: 'Internal logging',
        handler: (message, author, channel, data) => {
            Logging.log(chalk.yellow(`[${channel.server.name} :: #${channel.name}]`), chalk.green(`${author.name}:`), data.cleanContent)
        }
    }
]

export default Logger
