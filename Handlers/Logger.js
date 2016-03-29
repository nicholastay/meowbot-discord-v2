import chalk from 'chalk'

import Discord from '../Core/Discord'
import Logging from '../Core/Logging'

class Logger {
    get handlers() {
        return [
            {
                description: 'Internal logging',
                allowSelf: true,
                allowIgnored: true,
                handler: (message, author, channel, server, data) => {
                    let msg = `${data.meowIgnored ? chalk.grey('[i] ') : ''}${data.cleanContent}`
                    if (data.cleanContent.includes('\n')) msg = `${data.cleanContent.split('\n')[0]}... (newline break)`
                    if (data.attachments && data.attachments.length > 0) msg += chalk.grey(` [${data.attachments.length} attachment(s) - ${data.attachments.map(a => a.filename).join(', ')}]`)

                    if (!data.private) {
                        return Logging.log(chalk.yellow(`[${server.name} :: #${channel.name}]`), chalk[data.self ? 'magenta' : 'green'](`${author.name}:`), msg)
                    }

                    Logging.log(chalk.yellow('[PrivMsg]'), chalk[data.self ? 'magenta' : 'green'](author.name), '->', chalk[data.self ? 'green' : 'magenta'](`${data.self ? channel.recipient.username : Discord.client.user.name}:`), msg)
                }
            }
        ]
    }
}

export default new Logger
