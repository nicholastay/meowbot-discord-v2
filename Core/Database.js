import nedb from 'nedb-promise'
import path from 'path'

import Config from './Config'
import Logging from './Logging'

// Commands store
// Server specific settings store
const STORES = ['Commands', 'Servers'] // db stores

class Database {
    constructor() {
        this._storesPath = path.resolve(__dirname, '../', (Config.databasePath || './Database'))

        for (let k of STORES) {
            this[k] = new nedb({ filename: path.join(this._storesPath, `${k}.db`) })
            this[k].nedb.persistence.setAutocompactionInterval(45 * 60 * 1000) // compact the db every 45mins
        }
    }

    _load() {
        Logging.mlog('Database', 'Loading database(s) from file...')
        for (let k of STORES) {
            this[k].loadDatabase()
                   .then(() => Logging.mlog('Database', `'${k}' database store loaded successfully.`))
                   .catch(err => Logging.mlog('Database', `Error loading the database... - ${err}`))
        }
    }
}

export default new Database
