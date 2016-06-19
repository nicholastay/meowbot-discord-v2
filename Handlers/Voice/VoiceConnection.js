import DiscordStreamIntent from 'discord.js/lib/Voice/StreamIntent'

import Discord from '../../Core/Discord'
import Database from '../../Core/Database'

import TwitchVoice from './TwitchVoice'

class VoiceConnection {
    // Internal bot class for managing each connection
    constructor(parent, connection, textChannel) {
        this.parent = parent
        this.connection = connection
        this.textChannel = textChannel
        this._nowPlaying = null
        this._intent = null
        this.queue = []
        this.volume = 0.15

        this._autoDisconnect = setTimeout(() => this.leave(true), 10 * 60 * 1000) // timeout for auto d/c
        this.parent.timeouts.push(this._autoDisconnect)
    }

    get autoDisconnect() {
        return this._autoDisconnect
    }

    set autoDisconnect(timeout) {
        // ensure to clear the previous auto d/c from the main master
        let i = this.parent.timeouts.indexOf(this._autoDisconnect)
        if (i > -1) {
            clearTimeout(this.parent.timeouts[i])
            this.parent.timeouts.splice(i, 1)
        }
        this._autoDisconnect = null

        if (timeout) { // truthy = timeout
            this.parent.timeouts.push(timeout) // must be kept track
            this._autoDisconnect = timeout
        }
    }

    get intent() {
        return this._intent
    }

    set intent(intent) {
        if (intent instanceof DiscordStreamIntent) {
            intent.on('end', () => {
                this.nowPlaying = null

                if (this.voting) {
                    Discord.sendMessage(this.textChannel, `The vote started by ${this.voting.author.name} has been cancelled, as the track has now stopped playing.`)
                    clearTimeout(this.votingTimeout)
                    this.voting = null
                }

                this.playNext()
                this.intent = null
            })
        }
        this._intent = intent
    }

    get nowPlaying() {
        return this._nowPlaying
    }

    set nowPlaying(data) {
        if (data)
            Discord.sendMessage(this.textChannel, `**Now Playing**: **[${data.type}] ${data.name}** *(requested by ${data.requester.name})*`)

        this._nowPlaying = data
    }

    async addToQueue(data, server, permissionLevel, customMsg) {
        if (this.queue.length+1 >= this.parent.queueLimit)
            return 'Cannot queue any more tracks as we have already hit the limit set by my admin, sorry!'

        let serverLimit = ((await Database.Servers.findOne({ server: server.id })) || {}).voiceQueueLimit || 10
        if (permissionLevel < 1 && this.queue.length+1 >= serverLimit)
            return 'You have already reached your limit on this server to queue tracks, please calm down, eat a sandwich and try again later!'

        this.queue.push(data)
        if (!this.nowPlaying)
            this.playNext()

        return customMsg
    }

    async playNext() {
        if (!Discord.client.voiceConnection)
            return

        let nowPlay = this.queue.shift()
        if (!nowPlay) {
            Discord.sendMessage(this.textChannel, 'There are no more items in the queue, playback has now stopped.')
            this.autoDisconnect = setTimeout(() => this.leave(true), 10 * 60 * 1000) // 10 mins auto d/c
        }

        // twitch
        if (nowPlay.twitch) {
            nowPlay.twitchProcess = await TwitchVoice.getNodeStream(nowPlay.twitch)
            nowPlay.stream = nowPlay.twitchProcess.stream
        }

        if (nowPlay.file)
            this.intent = await this.connection.playFile(nowPlay.file, { volume: this.volume })
        else
            this.intent = await this.connection.playRawStream(nowPlay.stream, { volume: this.volume })

        this.nowPlaying = nowPlay
        if (this.autoDisconnect)
            this.autoDisconnect = null // playing (setter clears timeout)
    }

    leave(auto) { // kill self
        if (auto)
            Discord.sendMessage(this.textChannel, 'It has been 10mins since I have been used, leaving voice channel...')

        return Discord.client.leaveVoiceChannel(this.connection)
                             .then(() => {
                                 this.autoDisconnect = null // make sure setter clears this
                                 delete(this.parent.connections[this.textChannel.server.id])
                                 return Discord.sendMessage(this.textChannel, 'Left the voice channel.')
                             })
                             .catch(e => { return Discord.sendMessage(this.textChannel, `There was an error leaving voice... *${e}*`) })
    }
}

export default VoiceConnection