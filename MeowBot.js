import './Core/Config'
import Discord from './Core/Discord'
import Handlers from './Core/Handlers'

Discord.connect()
Handlers.loadAll()
