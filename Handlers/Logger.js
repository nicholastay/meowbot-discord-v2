import chalk from 'chalk'

import Discord from '../Core/Discord'
import Logging from '../Core/Logging'

class Logger {
    get handlers() {
        return [
            {
                description: 'Internal logging',
                allowSelf: true,
                handler: (message, author, channel, server, data) => {
                    if (data.cleanContent.includes('\n')) data.cleanContent = `${data.cleanContent.split('\n')[0]}... (newline break)`

                    if (!data.private) {
                        return Logging.log(chalk.yellow(`[${server.name} :: #${channel.name}]`), chalk[data.self ? 'magenta' : 'green'](`${author.name}:`), data.cleanContent)
                    }

                    Logging.log(chalk.yellow('[PrivMsg]'), chalk[data.self ? 'magenta' : 'green'](author.name), '->', chalk[data.self ? 'green' : 'magenta'](`${data.self ? channel.recipient.username : Discord.client.user.name}:`), data.cleanContent)
                }
            }
        ]
    }
}

export default new Logger
