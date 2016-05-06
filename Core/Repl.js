import repl from 'repl'

import Logging from './Logging'

class Repl {
    constructor() {
        this.server = null
    }

    start() {
        Logging.mlog('Repl', 'Starting REPL server...')
        this.server = repl.start({
            prompt: 'MeowV2> '
        })
        console.log('\n')
    }

    register(modules) {
        // Registers commands and contexts
        if (Array.isArray(modules)) {
            let loaded = []

            for (let m of modules) {
                let m1 = this._register(m, true)
                if (m1) loaded.push(m)
            }

            return Logging.mlog('Repl', `Registered contexts: ${loaded.join(', ')}`)
        }

        if (typeof modules === 'string' || modules instanceof String) {
            return this._register(modules)
        }
    }

    _register(module, bulk) {
        // internal register 1 module
        try {
            this.server.context[module] = require(`./${module}`)


            if (require(`./${module}`)._REPLCommands) {
                let commands = []

                for (let k in require(`./${module}`)._REPLCommands) {
                    this.server.defineCommand(k, require(`./${module}`)._REPLCommands[k])
                    commands.push(`.${k}`)
                    // Logging.mlog('Repl', `Registered the '.${k}' command for '${module}'.`)
                }

                Logging.mlog('Repl', `Registered ${commands.length} commands from '${module}'. [${commands.join(', ')}]`)
            }


            if (!bulk) {
                Logging.mlog('Repl', `Registered the '${module}' context.`)
            } else {
                return true
            }
        }
        catch (e) {
            Logging.mlog('Repl', `There was an error loading the '${module}' context - ${e}`)
            return false
        }
    }
}

export default new Repl
