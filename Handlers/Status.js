import Discord from '../Core/Discord'
import Config from '../Core/Config'
import Logging from '../Core/Logging'
import Tools from '../Core/Tools'

class Status {
    constructor() {
        if (!Config.status || !Config.status.messages) return Logging.mlog('StatusH', 'No status configuration detected, handler disabled.')

        // Standardize messages
        this.messages = []
        for (let m of Config.status.messages) {
            if (m instanceof String || typeof m === 'string') {
                // String
                this.messages.push({ message: m, status: 'online' })
                continue
            }

            // Object
            this.messages.push(m)
        }

        // Rotation disabled, just set the first one
        if (Config.status.messages.length < 2) {
            this.events = { // Update on first connect & disconnects
                'discord.ready': () => {
                    Discord.client.setStatus(this.messages[0].status, this.messages[0].message)
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

        let s = Discord.client.setStatus(this.messages[index].status, this.messages[index].message).catch(Logging.log)
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
