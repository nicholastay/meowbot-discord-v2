import nedb from 'nedb-promise'
import path from 'path'

import Config from './Config'
import Logging from './Logging'

// Commands store
// Server specific settings store
const STORES = [  // db stores
    { name: 'Commands' },
    { name: 'Servers' }
]

class Database {
    constructor() {
        if (Config.logging && Config.logging.toDatabase) {
            STORES.push({
                name: 'Messages',
                timestamp: true,
                indexes: [
                    { fieldName: 'createdAt', expireAfterSeconds: (Config.logging.databaseTTL || 7 * 24 * 60 * 60) }
                ]
            })
        }

        this._storesPath = path.resolve(__dirname, '../', (Config.databasePath || './Database'))

        for (let k of STORES) {
            this[k.name] = new nedb({
                filename: path.join(this._storesPath, `${k.name}.db`),
                timestampData: k.timestamp ? true : false
            })
            this[k.name].nedb.persistence.setAutocompactionInterval(45 * 60 * 1000) // compact the db every 45mins
            this[k.name].nedb.on('compaction.done', () => Logging.mlog('Database', `Routinely compaction for ${k.name} done.`))
            if (k.indexes) {
                for (let m of k.indexes) {
                    this[k.name].ensureIndex(m).catch(Logging.log)
                }
            }
        }
    }

    _load() {
        Logging.mlog('Database', 'Loading database(s) from file...')
        for (let k of STORES) {
            this[k.name].loadDatabase()
                        .then(() => Logging.mlog('Database', `'${k.name}' database store loaded successfully.`))
                        .catch(err => Logging.mlog('Database', `Error loading the database... - ${err}`))
        }
    }
}

export default new Database
