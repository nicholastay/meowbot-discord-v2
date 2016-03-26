import nedb from 'nedb-promise'
import path from 'path'

import Config from './Config'
import Logging from './Logging'

class Database {
    constructor() {
        this.db = new nedb({
            filename: path.resolve(__dirname, '../', (Config.database || 'MeowBot.db'))
        })
        this.db.nedb.persistence.setAutocompactionInterval(45 * 60 * 1000) // compact the db every 45mins
    }

    load() {
        Logging.mlog('Database', 'Loading database from file...')
        this.db.loadDatabase()
               .then(() => Logging.mlog('Database', 'Database loaded successfully.'))
               .catch(err => Logging.mlog('Database', `Error loading the database... - ${err}`))
    }
}

export default new Database
