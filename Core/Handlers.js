import fs from 'fs'
import path from 'path'

import Tools from './Tools'
import Logging from './Logging'

let scope

class Handlers {
    constructor() {
        scope = this // ffs
        this.handlers = {}

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
    }

    load(handlerName) {
        try {
            this.handlers[handlerName] = require(`../Handlers/${handlerName}`)
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
