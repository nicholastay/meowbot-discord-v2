import chalk from 'chalk'

import Config from '../Core/Config'
import Database from '../Core/Database'
import Discord from '../Core/Discord'
import Logging from '../Core/Logging'

class Logger {
    get events() {
        return {
            'chat.edited': (prev, updated) => {
                if (prev.content === updated.content)
                    return // sometimes it glitches like this so check
                updated.meowEdited = prev
                this.log(updated.content, updated.author, updated.channel, updated.channel.server, updated)
            },
            'chat.deleted': (message, channel) => {
                if (!message)
                    return Logging.log(chalk.yellow(`[${channel.server.name} :: #${channel.name}]`), chalk.red('[x]'), chalk.grey('Unidentified message was deleted...'))
                if (message.meowEdited)
                    delete(message.meowEdited)
                message.meowDeleted = true
                this.log(message.content, message.author, message.channel, message.channel.server, message)
            }
        }
    }

    get handlers() {
        return [
            {
                description: 'Internal logging',
                allowSelf: true,
                allowIgnored: true,
                handler: this.log.bind(this)
            }
        ]
    }

    log(...data) {
        this.logToConsole(...data)

        if (Database.Messages)
            this.logToDatabase(...data) // if the db is loaded go for it
    }

    logToDatabase(message, author, channel, server, data) {
        if ((author.id === Discord.client.user.id && !Config.logging.logSelf) || // do not log own msgs to db if config is false (default)
            (Config.logging.doNotLogChannels && Config.logging.doNotLogChannels.indexOf(channel.id) > -1) || // channel ignored
            (Config.logging.doNotLogUsers && Config.logging.doNotLogUsers.indexOf(author.id) > -1) || // user ignored
            (Config.logging.logChangesOnly && !(data.meowDeleted || data.meowEdited)) || // config option for changes only
            (Config.logging.doNotLogBots && author.bot)) // oauth compliance bots option
            return


        let storeData = {
            id: data.id,
            message: data.cleanContent,
            author: {
                id: author.id,
                name: author.name
            }
        }

        if (data.private) {
            storeData.private = true
        } else {
            storeData.channel = {
                id: channel.id,
                name: channel.name
            }
            storeData.server = {
                id: server.id,
                name: server.name
            }
        }

        if (data.meowDeleted) {
            if (Config.logging.logChangesOnly) {
                storeData.deleted = true
                return Database.Messages.insert(storeData).catch(Logging.log)
            }
            else {
                return Database.Messages.update(storeData, { $set: { deleted: true } }).catch((e) => Logging.mlog('LoggerH+DB', `warn: message deleted but existing message wasnt found in db, no field updated - ${e}`))
            }
        }

        if (data.meowEdited) {
            storeData.edited = true
            storeData.previous = data.meowEdited.cleanContent
        }

        if (data.ignored)
            storeData.ignored = true

        return Database.Messages.insert(storeData)
                                .catch(Logging.log)
    }

    logToConsole(message, author, channel, server, data) {
        let msg = `${data.meowIgnoredChannel ? chalk.grey('[iC] ') : ''}${data.meowEdited ? chalk.cyan('[e] ') : ''}${data.meowIgnoredUser ? chalk.grey('[iU] ') : ''}${data.meowEdited ? chalk.cyan('[e] ') : ''}${data.meowDeleted ? chalk.red('[x] ') : ''}${data.meowDeleted ? chalk.grey(data.cleanContent) : data.cleanContent}`

        if (data.cleanContent.includes('\n'))
            msg = `${msg.split('\n')[0]}... (newline break)`

        if (data.meowEdited) {
            let previousMsg = data.meowEdited.cleanContent
            if (previousMsg.includes('\n'))
                previousMsg = `${previousMsg.split('\n')[0]}... (newline break)`
            msg += ` ${chalk.grey(`[previous message: ${previousMsg}]`)}`
        }

        if (data.attachments && data.attachments.length > 0)
            msg += chalk.grey(` [${data.attachments.length} attachment(s) - ${data.attachments.map(a => a.filename).join(', ')}]`)

        if (!data.private && server)
            return Logging.log(chalk.yellow(`[${server.name} :: #${channel.name}]`), chalk[data.self ? 'magenta' : 'green'](`${author.name}:`), msg)

        Logging.log(chalk.yellow('[PrivMsg]'), chalk[data.self ? 'magenta' : 'green'](author.name), '->', chalk[data.self ? 'green' : 'magenta'](`${data.self ? channel.recipient.username : Discord.client.user.name}:`), msg)
    }
}

export default new Logger
