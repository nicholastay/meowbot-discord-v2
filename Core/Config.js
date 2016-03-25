import Tools from './Tools'
import Logging from './Logging'

let _keys = []

class Config {
    constructor() {
        this._reload(true)
    }

    _reload(first) {
        if (!first) {
            // Unload
            for (let k of _keys) {
                if (this[k]) delete(this[k])
            }
            if (Tools.hotUnload('../config')) Logging.mlog('Config', 'Config unloaded.')
        }

        let config = require('../config')
        _keys = Object.keys(config)
        Object.assign(this, config)
        Logging.mlog('Config', 'Config loaded.')
    }
}

export default new Config
