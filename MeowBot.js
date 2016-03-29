import chalk from 'chalk'

import './Core/Config'
import Database from './Core/Database'
import Discord from './Core/Discord'
import Logging from './Core/Logging'
import Handlers from './Core/Handlers'
import Repl from './Core/Repl'

Discord.connect()
Database._load()
Handlers.loadAll()

Repl.start()
Repl.register([
    'Config',
    'Database',
    'Discord',
    'Events',
    'Handlers',
    'Logging',
    'Tools'
])



// Not a very good practice, but believed to be an error thrown by the way ytdl-core works.
// Based on meew0's work, Lethe. Others in the Discord bot community have also got this error
// and have found it safe to ignore, so we're going to have to do this.
// Well this way we can do a 'funny' uncaught dying message anyway...
process.on('uncaughtException', err => {
    if (err.code === 'ECONNRESET') {
        Logging.mlog('Process', 'ECONNRESET error received... probably safe to ignore. Stacktrace for debug anyway:')
        Logging.mlog(err.stack)
        return
    }

    console.log('\n')
    Logging.log(chalk.red('FATAL UNCAUGHT EXCEPTION, WE\'RE GOING DOWN!'))
    Logging.log(chalk.red(err.stack))
    process.exit(1)
})
