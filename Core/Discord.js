import DiscordJS from 'discord.js'

import Config from './Config'
import Handlers from './Handlers'
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
        })
        this.client.on('disconnected', () => {
            this.aliveSince = null
            Logging.mlog('Discord', 'Connection dropped to Discord, will attempt reconnections per 2.5mins...')
            let reconnInterval = setInterval(() => {
                Logging.mlog('Discord', 'Reconnecting to Discord...')
                this.login()
                    .then(token => {
                        if (token) clearInterval(reconnInterval) // Logged in, clear interval
                    })
            }, 2.5 * 60 * 1000)
        })
        this.client.on('message', Handlers.handleMessage)

        this.sendMessage = this.client.sendMessage.bind(this.client) // direct passthru

        this.login()
    }

    reply(data, message) {
        let firstLetter
        if (data.private) firstLetter = message[0].toUpperCase() // caps first letter for better appearance in PM replies
        else firstLetter = message[0].toLowerCase() // do the opposite

        this.client.reply(data, firstLetter + message.substr(1, message.length))
    }

    login() {
        if (!Config.discord) throw new Error('No Discord login info set in Config, please verify and restart bot.')
        if (Config.discord.token) {
            Logging.mlog('Discord', 'Logging in to Discord... (token auth)')
            return this.client.loginWithToken(Config.discord.token)
        }
        if (Config.discord.email && Config.discord.password) {
            Logging.mlog('Discord', 'Logging in to Discord...')
            return this.client.login(Config.discord.email, Config.discord.password)
        }
        throw new Error('Invalid email/password/token setup in config, please verify and restart bot.')
    }
}

export default new Discord
