import chalk from 'chalk'

import Discord from '../Core/Discord'
import Logging from '../Core/Logging'

class Logger {
    get events() {
        return {
            'chat.edited': (prev, updated) => {
                updated.meowEdited = prev
                this.logToConsole(updated.content, updated.author, updated.channel, updated.channel.server, updated)
            },
            'chat.deleted': (message, channel) => {
                if (!message) return Logging.log(chalk.yellow(`[${channel.server.name} :: #${channel.name}]`), chalk.red('[x]'), chalk.grey('Unidentified message was deleted...'))
                if (message.meowEdited) delete(message.meowEdited)
                message.meowDeleted = true
                this.logToConsole(message.content, message.author, message.channel, message.channel.server, message)
            }
        }
    }

    get handlers() {
        return [
            {
                description: 'Internal logging',
                allowSelf: true,
                allowIgnored: true,
                handler: this.logToConsole.bind(this)
            }
        ]
    }

    logToConsole(message, author, channel, server, data) {
        let msg = `${data.meowIgnored ? chalk.grey('[i] ') : ''}${data.meowEdited ? chalk.cyan('[e] ') : ''}${data.meowDeleted ? chalk.red('[x] ') : ''}${data.meowDeleted ? chalk.grey(data.cleanContent) : data.cleanContent}`
        if (data.cleanContent.includes('\n')) msg = `${msg.split('\n')[0]}... (newline break)`

        if (data.meowEdited) {
            let previousMsg = data.meowEdited.cleanContent
            if (previousMsg.includes('\n')) previousMsg = `${previousMsg.split('\n')[0]}... (newline break)`
            msg += ` ${chalk.grey(`[previous message: ${previousMsg}]`)}`
        }

        if (data.attachments && data.attachments.length > 0) msg += chalk.grey(` [${data.attachments.length} attachment(s) - ${data.attachments.map(a => a.filename).join(', ')}]`)

        if (!data.private) {
            return Logging.log(chalk.yellow(`[${server.name} :: #${channel.name}]`), chalk[data.self ? 'magenta' : 'green'](`${author.name}:`), msg)
        }

        Logging.log(chalk.yellow('[PrivMsg]'), chalk[data.self ? 'magenta' : 'green'](author.name), '->', chalk[data.self ? 'green' : 'magenta'](`${data.self ? channel.recipient.username : Discord.client.user.name}:`), msg)
    }
}

export default new Logger
