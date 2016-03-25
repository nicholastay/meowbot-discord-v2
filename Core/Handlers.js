import fs from 'fs'
import path from 'path'

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
            'r': {
                help: '[Handlers] Reloads all message handlers',
                action: this.reloadAll.bind(this)
            }
        }
    }

    handleMessage(message) {
        for (let k in scope.handlers) {
            for (let h of scope.handlers[k]) {
                h.handler(message.content, message.author, message.channel, message)
            }
        }


        let tail    = message.content.split(' ')
          , command = tail.shift()

        if (scope.commands[command]) {
            let h = scope.commands[command].handler(message.content, message.author, message.channel, message)
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
            if (h.handlers) this.handlers[handlerName] = h.handlers
            if (h.commands) {
                for (let k in h.commands) {
                    if (this.commands[k]) return Logging.mlog('Handlers', `A command with trigger '${k}' already exists, it has not been overrided from the one from '${handlerName}'.`)
                    this.commands[k] = h.commands[k]
                    Logging.mlog('Handlers', `Loaded command '${k}' (${handlerName}).`)
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
            return Logging.mlog('Handlers', `Unloaded handler '${handlerName}'.`)
        }
        Logging.mlog('Handlers', `'${handlerName}' could not be unloaded, nothing has changed.`)
    }

    loadAll() {
        this._loadunload(false)
    }

    unloadAll() {
        this._loadunload(true)
    }

    _loadunload(unload) {
        Logging.mlog('Handlers', `${unload ? 'Unl' : 'L'}oading all handlers...`)
        for (let handler of fs.readdirSync(path.join(__dirname, '../Handlers'))) {
            if (path.extname(handler) !== '.js') return

            if (unload) this.unload(handler.replace('.js', ''))
            else this.load(handler.replace('.js', ''))
        }
        Logging.mlog('Handlers', `All handlers ${unload ? 'unl' : 'l'}oaded.`)
    }

    reloadAll() {
        this.unloadAll()
        this.loadAll()
    }
}

export default new Handlers
