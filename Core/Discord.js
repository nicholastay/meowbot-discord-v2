import DiscordJS from 'discord.js'

import Config from './Config'
import Events from './Events'
import Logging from './Logging'

class Discord {
    constructor() {
        this.client = null
        this.aliveSince = null
    }

    connect() {
        this.client = new DiscordJS.Client()

        this.client.on('ready', () => {
            Logging.mlog('Discord', 'Connected to Discord.')
            this.aliveSince = new Date()
            Events.emit('discord.ready')
        })
        this.client.on('disconnected', () => {
            this.aliveSince = null
            Logging.mlog('Discord', 'Connection dropped to Discord, will attempt reconnections per 2.5mins...')
            Events.emit('discord.disconnected')
            let reconnect = () => {
                Logging.mlog('Discord', 'Reconnecting to Discord...')
                this.login()
                    .then(token => {
                        if (token) {
                            clearInterval(reconnInterval) // Logged in, clear interval
                            this.aliveSince = new Date() // and also set a new alive time
                        }
                    })
            }
            let reconnInterval = setInterval(() => reconnect(), 2.5 * 60 * 1000)
            reconnect() // first try
        })
        this.client.on('error', Logging.log)
        this.client.on('message', (data) => Events.emit('chat.message', data))
        this.client.on('messageUpdated', (old, changed) => Events.emit('chat.edited', old, changed))
        this.client.on('messageDeleted', (message, channel) => Events.emit('chat.deleted', message, channel))

        this.sendMessage = this.client.sendMessage.bind(this.client) // direct passthru

        this.login()
    }

    reply(data, message) {
        let firstLetter
        if (data.private) firstLetter = message[0].toUpperCase() // caps first letter for better appearance in PM replies
        else if (!message.startsWith('I ')) firstLetter = message[0].toLowerCase() // do the opposite (excluding 'I' like 'I want to ...')
        else firstLetter = message[0]

        return this.client.reply(data, firstLetter + message.substr(1, message.length))
    }

    login() {
        if (!Config.discord.token && process.env.DISCORD_TOKEN) {
            Config.discord.token = process.env.DISCORD_TOKEN
        }
        if (Config.discord.token) {
            Logging.mlog('Discord', 'Logging in to Discord... (token auth)')
            return this.client.loginWithToken(Config.discord.token)
        }
        if (Config.discord.email && Config.discord.password) {
            Logging.mlog('Discord', 'Logging in to Discord...')
            return this.client.login(Config.discord.email, Config.discord.password)
        }
        throw new Error('Invalid email/password/token setup in config/env variable, please verify and restart bot.')
    }
}

export default new Discord
