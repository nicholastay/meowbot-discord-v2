import './Core/Config'
import Discord from './Core/Discord'
import Handlers from './Core/Handlers'
import Repl from './Core/Repl'

Discord.connect()
Handlers.loadAll()

Repl.start()
Repl.register([
    'Config',
    'Discord',
    'Handlers',
    'Tools'
])
