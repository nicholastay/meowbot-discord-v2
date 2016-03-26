import './Core/Config'
import Database from './Core/Database'
import Discord from './Core/Discord'
import Handlers from './Core/Handlers'
import Repl from './Core/Repl'

Discord.connect()
Database.load()
Handlers.loadAll()

Repl.start()
Repl.register([
    'Config',
    'Database',
    'Discord',
    'Handlers',
    'Tools'
])
