import repl from 'babel-repl'

import Logging from './Logging'

class Repl {
    constructor() {
        this.server = null
    }

    start() {
        Logging.mlog('Repl', 'Starting REPL server...')
        this.server = repl.start({
            prompt: 'MeowES6> '
        })
        console.log('\n')
    }

    register(modules) {
        // Registers commands and contexts
        if (Array.isArray(modules)) {
            for (let m of modules) {
                this._register(m)
            }
            return
        }
        if (typeof modules === 'string' || modules instanceof String) {
            return this._register(modules)
        }
    }

    _register(module) {
        // internal register 1 module
        try {
            this.server.context[module] = require(`./${module}`)
            if (require(`./${module}`)._REPLCommands) {
                for (let k in require(`./${module}`)._REPLCommands) {
                    this.server.defineCommand(k, require(`./${module}`)._REPLCommands[k])
                    Logging.mlog('Repl', `Registered the '.${k}' command for '${module}'.`)
                }
            }
            Logging.mlog('Repl', `Registered the '${module}' context.`)
        }
        catch (e) {
            Logging.mlog('Repl', `There was an error loading the '${module}' context - ${e}`)
        }
    }
}

export default new Repl
