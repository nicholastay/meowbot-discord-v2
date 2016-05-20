import Discord from '../Core/Discord'
import Config from '../Core/Config'
import Logging from '../Core/Logging'
import Tools from '../Core/Tools'

class Status {
    constructor() {
        if (!Config.status || !Config.status.messages)
            return Logging.mlog('StatusH', 'No status configuration detected, handler disabled.')

        // Standardize messages
        this.messages = []
        for (let m of Config.status.messages) {
            if (m instanceof String || typeof m === 'string') {
                // String
                this.messages.push({ message: m, status: 'online' })
                continue
            }

            // Object
            if (!m.message) {
                Logging.mlog('StatusH', 'invalid status message config detected, ensure the object has .message with a message')
                continue
            }
            if (m.status === 'streaming') {
                if (!m.url)
                    m.url = 'https://twitch.tv/n2468txd' // placeholder auto
                else if (m.url.indexOf('twitch.tv') < 0)
                    Logging.mlog('StatusH', `warn: status streaming type status '${m.message}' does not seem to have a twitch.tv url. May not display/set as intended.`)
            } else if (!m.status) {
                m.status = 'online'
            }

            this.messages.push(m)
        }

        // Rotation disabled, just set the first one
        if (Config.status.messages.length < 2) {
            this.events = { // Update on first connect & disconnects
                'discord.ready': () => {
                    if (this.messages[0].status === 'streaming')
                        Discord.client.setStreaming(this.messages[0].message, this.messages[0].url, 1).catch(Logging.log)
                    else
                        Discord.client.setStatus(this.messages[0].status, this.messages[0].message).catch(Logging.log)
                }
            }
            return Logging.mlog('StatusH', 'Status rotation disabled, setting first one only.')
        }

        // Random
        this.random = Config.status.random || false
        if (!this.random) {
            this.counter = 0
            Logging.mlog('StatusH', 'Sequential status rotation mode, rotating through statuses in order.')
        } else {
            Logging.mlog('StatusH', 'Random status rotation mode, will randomly pick statuses each time.')
        }

        // Rotation interval
        this.rotateEvery = Config.status.interval || 10 * 60 * 1000

        this.intervals = [
            setInterval(this.updateStatus.bind(this), this.rotateEvery)
        ]

        this.events = {
            'discord.ready': () => {
                if (this.intervals.length < 1)
                    this.intervals = [setInterval(this.updateStatus.bind(this), this.rotateEvery)] // if disconnected and back

                this.updateStatus() // kick it off with the first one
                Logging.mlog('StatusH', `Interval set, will rotate status messages every ${this.rotateEvery / 1000 / 60} minutes.`)
            },
            'discord.disconnected': () => {
                clearInterval(this.intervals[0])
                this.intervals = []
            }
        }
    }

    updateStatus() {
        let index
        if (this.random) {
            index = Tools.getRandomInt(0, this.messages.length)
        } else {
            index = this.counter
            this.counter++
            if (this.counter >= this.messages.length)
                this.counter = 0
        }

        let s
        if (this.messages[index].status === 'streaming')
            s = Discord.client.setStreaming(this.messages[index].message, this.messages[index].url, 1).catch(Logging.log)
        else
            s = Discord.client.setStatus(this.messages[index].status, this.messages[index].message).catch(Logging.log)

        if (Config.status.printOnChange)
            s.then(() => Logging.mlog('StatusH', `Status changed to: ${this.messages[index].message} [${this.messages[index].status}].`))
    }

    get commands() {
        return {
            'statusrotate': {
                description: 'Forces the status to rotate to the next one.',
                permissionLevel: 3,
                reply: true,
                handler: () => {
                    this.updateStatus()
                    return 'Status rotated to the next in line.'
                }
            }
        }
    }
}

export default new Status
