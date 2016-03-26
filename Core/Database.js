import nedb from 'nedb-promise'
import path from 'path'

import Config from './Config'
import Logging from './Logging'

class Database {
    constructor() {
        this.store = path.resolve(__dirname, '../', (Config.databasePath || './Database'))

        this.db = {
            Commands: new nedb({ filename: path.join(this.store, 'Commands.db') })
        }

        for (let k in this.db) { // set options for every datastore
            this.db[k].nedb.persistence.setAutocompactionInterval(45 * 60 * 1000) // compact the db every 45mins
        }
    }

    load() {
        Logging.mlog('Database', 'Loading database(s) from file...')
        for (let k in this.db) {
            this.db[k].loadDatabase()
                      .then(() => Logging.mlog('Database', `'${k}' database store loaded successfully.`))
                      .catch(err => Logging.mlog('Database', `Error loading the database... - ${err}`))
        }
    }
}

export default new Database
