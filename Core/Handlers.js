import fs from 'fs'
import path from 'path'

import Config from './Config'
import { db as Database } from './Database'
import Discord from './Discord'
import Events from './Events'
import Tools from './Tools'
import Logging from './Logging'

class Handlers {
    constructor() {
        this.handlers = {}
        this.commands = {}
        this.intervals = {}
        this.events = {}

        this._REPLCommands = {
            'ra': {
                help: '[Handlers] Reloads all message handler(s)',
                action: this.reloadAll.bind(this)
            },
            'r': {
                help: '[Handlers] Reloads one message handler with the name of it',
                action: (h) => this.reload(h)
            },
            'l': {
                help: '[Handlers] Load a new message handler with the name of it',
                action: (h) => this.load(h)
            }
        }

        Events.on('chat.message', m => this.handleMessage(m).catch(Logging.log))
    }

    async handleMessage(message) {
        // General information
        message.private = message.channel instanceof require('discord.js').PMChannel
        message.self = message.author.id === Discord.client.user.id


        // Basic low-level message handlers
        for (let k in this.handlers) {
            for (let h of this.handlers[k]) {
                if (message.self && !h.allowSelf) continue // since this is a more crude handler, allow such behavior if explicitly set
                h.handler(message.content, message.author, message.channel, message)
            }
        }


        // Higher level command handlers
        if (message.self) return // no commands allowed to be by self

        // Prefix checking and grabbing from db
        let serverSettings = (await Database.Servers.findOne({ server: message.channel.server.id })) || {}
          , rawPrefix      = serverSettings.prefix || Config.prefix || '!'
          , prefix         = (rawPrefix === '$mention$') ? `<@${Discord.client.user.id}> ` : rawPrefix
        if (!message.content.startsWith(prefix)) return

        let params  = message.content.replace(prefix, '').split(' ') // strip prefix & leave as array of params
          , command = params.shift()

        if (this.commands[command]) {
            if (this.commands[command]._alias) command = this.commands[command]._alias // switch context to alias

            if ((this.commands[command].blockGeneral && !message.private) || (this.commands[command].blockPM && message.private)) return // if in a general server chat and its a pm or other way round dont allow it based on command settings

            // Basic permissions
            // 0 = general nobody, 1 = server mod, 2 = server admin, 3 = bot admin
            let perms = 0
            if (Config.admins.indexOf(message.author.id) > -1) perms = 3
            else if (!message.private) {
                let userRoles = message.channel.server.rolesOfUser(message.author)
                if (userRoles.find(r => r.name === 'MeowAdmins')) perms = 2
                else if (userRoles.find(r => r.name === 'MeowMods')) perms = 1
            }

            if (this.commands[command].permissionLevel) {
                if (this.commands[command].permissionLevel > perms) {
                    if (this.commands[command].hidden) return // shutup on a hidden command
                    return Discord.reply(message, (this.commands[command].noPermissionsResponse || 'You do not have permissions to run that command.'))
                }
            }

            let h = this.commands[command].handler(params, message.author, message.channel, message)
              , r = this.commands[command].reply

            if (h instanceof Promise) {
                return h.then(p => { if (p) Discord[r ? 'reply' : 'sendMessage'](message, p) })
                        .catch(e => {
                            Logging.log(e.stack)
                            Discord.sendMessage(message, `An error occurred... - \`${e}\``)
                        })
            }
            if (h instanceof String || typeof h === 'string') {
                return Discord[r ? 'reply' : 'sendMessage'](message, h)
                              .catch(e => Logging.log(e.stack))
            }
        }
    }

    load(handlerName) {
        try {
            let h = require(`../Handlers/${handlerName}`)
            if (h.handlers) {
                if (!Array.isArray(h.handlers)) return
                this.handlers[handlerName] = h.handlers
                Logging.mlog('Handlers', `Loaded ${h.handlers.length} message handler(s) from '${handlerName}'.`)
            }
            if (h.commands) {
                let commands = []
                for (let k in h.commands) {
                    if (this.commands[k]) {
                        Logging.mlog('Handlers', `A command with trigger '${k}' already exists, it has not been overrided from the one from '${handlerName}'.`)
                        continue
                    }
                    this.commands[k] = h.commands[k]
                    this.commands[k].fromHandler = handlerName
                    commands.push(k)
                    if (this.commands[k].alias) {
                        for (let a of this.commands[k].alias) {
                            if (this.commands[a]) {
                                Logging.mlog('Handlers', `A command with trigger '${a}' already exists, it has not been overrided with an alias from '${handlerName}'.`)
                                continue
                            }
                            this.commands[a] = {
                                _alias: k, // internal alias marker '_'
                                fromHandler: handlerName
                            }
                            Logging.mlog('Handlers', `Registering alias '${a}' -> '${k}' [${handlerName}]`)
                        }
                    }
                    // Logging.mlog('Handlers', `Loaded command '${k}' (from '${handlerName}').`)
                }
                Logging.mlog('Handlers', `Loaded ${commands.length} commands from '${handlerName}'. [${commands.join(', ')}]`)
            }
            if (h.intervals) {
                if (!Array.isArray(h.intervals)) return
                this.intervals[handlerName] = h.intervals
                Logging.mlog('Handlers', `Loaded ${h.intervals.length} interval(s) from '${handlerName}'`)
            }
            if (h.events) {
                this.events[handlerName] = h.events
                for (let k in this.events[handlerName]) {
                    Events.on(k, this.events[handlerName][k])
                }
                Logging.mlog('Handlers', `Loaded ${Object.keys(this.events[handlerName]).length} event listener(s) from '${handlerName}'`)
            }
            Logging.mlog('Handlers', `Loaded handler '${handlerName}'.`)
        }
        catch (e) {
            Logging.mlog('Handlers', `Error loading handler '${handlerName}' - \n${e.stack}`)
        }
    }

    unload(handlerName) {
        if (Tools.hotUnload(`../Handlers/${handlerName}`)) {
            if (this.handlers[handlerName]) delete(this.handlers[handlerName])
            if (Object.keys(this.commands).length > 0) {
                for (let k in this.commands) {
                    if (this.commands[k].fromHandler === handlerName) delete this.commands[k]
                }
            }
            if (this.intervals[handlerName]) {
                for (let i of this.intervals[handlerName]) {
                    clearInterval(i)
                }
                delete(this.intervals[handlerName])
            }
            if (this.events[handlerName]) {
                for (let k in this.events[handlerName]) {
                    Events.removeListener(k, this.events[handlerName][k])
                }
            }
            return Logging.mlog('Handlers', `Unloaded handler '${handlerName}'.`)
        }
        Logging.mlog('Handlers', `'${handlerName}' could not be unloaded, nothing has changed.`)
    }

    reload(handlerName) {
        this.unload(handlerName)
        this.load(handlerName)
    }

    loadAll() {
        this._loadunloadAll(false)
    }

    unloadAll() {
        this._loadunloadAll(true)
    }

    _loadunloadAll(unload) {
        Logging.mlog('Handlers', `${unload ? 'Unl' : 'L'}oading all handler(s)...`)
        for (let handler of fs.readdirSync(path.join(__dirname, '../Handlers'))) {
            if (path.extname(handler) !== '.js') continue

            if (unload) this.unload(handler.replace('.js', ''))
            else this.load(handler.replace('.js', ''))
        }
        Logging.mlog('Handlers', `All handler(s) ${unload ? 'unl' : 'l'}oaded.`)
    }

    reloadAll() {
        this.commands = {} // reduced strain, no iteration
        this.unloadAll()
        this.loadAll()
    }
}

export default new Handlers
