import fs from 'fs'
import path from 'path'

import Config from './Config'
import Discord from './Discord'
import Tools from './Tools'
import Logging from './Logging'

let scope

class Handlers {
    constructor() {
        scope = this // ffs
        this.handlers = {}
        this.commands = {}

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
    }

    handleMessage(message) {
        // General information
        message.private = message.channel instanceof require('discord.js').PMChannel
        message.self = message.author.id === Discord.client.user.id


        // Basic low-level message handlers
        for (let k in scope.handlers) {
            for (let h of scope.handlers[k]) {
                if (message.self && !h.allowSelf) continue // since this is a more crude handler, allow such behavior if explicitly set
                h.handler(message.content, message.author, message.channel, message)
            }
        }


        // Higher level command handlers
        if (message.self) return // no commands allowed to be by self
        let prefix = (Config.prefix === '$mention$') ? `<@${Discord.user.id}> ` : (Config.prefix || '!')
        if (!message.content.startsWith(prefix)) return

        let params  = message.content.replace(prefix, '').split(' ') // strip prefix & leave as array of params
          , command = params.shift()

        if (scope.commands[command]) {
            if ((scope.commands[command].general && message.private) || (scope.commands[command].pm && !message.private)) return // if in a general server chat and its a pm or other way round dont allow it based on command settings

            // Basic permissions
            // 0 = general nobody, 1 = server mod, 2 = server admin, 3 = bot admin
            let perms = 0
            if (Config.admins.indexOf(message.author.id) > -1) perms = 3
            else {
                let userRoles = message.channel.server.rolesOfUser(message.author)
                if (userRoles.find(r => r.name === 'MeowAdmins')) perms = 2
                else if (userRoles.find(r => r.name === 'MeowMods')) perms = 1
            }

            if (scope.commands[command].permissionLevel) {
                if (scope.commands[command].permissionLevel > perms) return Discord.client.reply(message, (scope.commands[command].noPermissionsResponse || 'You do not have permissions to run that command.'))
            }

            let h = scope.commands[command].handler(params, message.author, message.channel, message)
              , r = scope.commands[command].reply

            if (h instanceof Promise) {
                return h.then(p => Discord.client[r ? 'reply' : 'sendMessage'](message, p))
                        .catch(Logging.log)
            }
            if (h instanceof String || typeof h === 'string') {
                return Discord.client[r ? 'reply' : 'sendMessage'](message, h)
                              .catch(Logging.log)
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
                for (let k in h.commands) {
                    if (this.commands[k]) {
                        Logging.mlog('Handlers', `A command with trigger '${k}' already exists, it has not been overrided from the one from '${handlerName}'.`)
                        continue
                    }
                    this.commands[k] = h.commands[k]
                    this.commands[k].fromHandler = handlerName
                    Logging.mlog('Handlers', `Loaded command '${k}' (from '${handlerName}').`)
                }
            }
            Logging.mlog('Handlers', `Loaded handler '${handlerName}'.`)
        }
        catch (e) {
            Logging.mlog('Handlers', `Error loading handler '${handlerName}' - ${e}`)
        }
    }

    unload(handlerName) {
        if (Tools.hotUnload(`../Handlers/${handlerName}`)) {
            delete(this.handlers[handlerName])
            if (Object.keys(this.commands).length > 0) {
                for (let k in this.commands) {
                    if (this.commands[k].fromHandler === handlerName) delete this.commands[k]
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
