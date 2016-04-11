import ytdl from 'ytdl-core'
import thenify from 'thenify'

import DiscordStreamIntent from 'discord.js/lib/Voice/StreamIntent'

import Discord from '../Core/Discord'
import Logging from '../Core/Logging'

ytdl.getInfoAsync = thenify(ytdl.getInfo) // promise wrapper

class VoiceConnection {
    // Internal bot class for managing each connection
    constructor(connection, textChannel) {
        this.connection = connection
        this.textChannel = textChannel
        this._nowPlaying = null
        this._intent = null
        this.queue = []
        this.volume = 0.15
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
        if (data) Discord.sendMessage(this.textChannel, `**Now Playing**: **[${data.type}] ${data.name}** *(requested by ${data.requester.name})*`)
        this._nowPlaying = data
    }

    addToQueue(data) {
        this.queue.push(data)
        if (!this.nowPlaying) {
            return this.playNext()
        }
    }

    async playNext() {
        if (!Discord.client.voiceConnection) return
        let nowPlay = this.queue.shift()
        if (!nowPlay) return Discord.sendMessage(this.textChannel, 'There are no more items in the queue, playback has now stopped.')

        if (nowPlay.file) this.intent = await this.connection.playFile(nowPlay.file, { volume: this.volume })
        else this.intent = await this.connection.playRawStream(nowPlay.stream, { volume: this.volume })

        this.nowPlaying = nowPlay
    }
}

class Voice {
    constructor() {
        if (Discord.client.voiceConnections.length > 0) {
            for (let vc of Discord.client.voiceConnections) {
                Discord.client.leaveVoiceChannel(vc)
            }
        }

        this.connections = {} // structure: {text channel binded: VoiceConnection object}

        this.events = {
            'discord.disconnected': () => {
                // Disconnection ensure var reset
                this.textChannel = null
            }
        }
    }

    get commands() {
        return {
            'voice': {
                description: 'Joins a voice channel or leaves one if its already in it.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to make MeowBot join a voice channel.',
                reply: true,
                handler: (params, author, channel, server) => {
                    // leaving mechanism
                    if (!params[0] && this.connections[server.id]) {
                        return Discord.client
                                      .leaveVoiceChannel(this.connections[server.id].connection)
                                      .then(() => {
                                          delete(this.connections[server.id])
                                          return 'Left the voice channel.'
                                      })
                                      .catch(e => { return `There was an error leaving voice... *${e}*` })
                    }

                    if (this.connections[server.id] && this.connections[server.id].textChannel.id === channel.id) {
                        return `This text channel is already connected to and bound to the voice channel '${this.connections[server.id].connection.voiceChannel.name}'!`
                    }

                    if (this.connections[server.id]) {
                        return `There is already an active voice connection for this server. There can only be one voice connection per server. For you information, I am currently in '${this.connections[server.id].connection.voiceChannel.name}' (bound to text channel ${this.connections[server.id].textChannel.mention()}).`
                    }


                    if (!params[0]) return 'You need to specify a voice channel for me to join!'
                    //if (Discord.client.voiceConnection) return 'I am currently in a voice channel of another channel/server, sorry!'

                    let chanName   = params.join(' ')
                      , voiceChan  = server.channels.find(c => c.type === 'voice' && c.name === chanName)
                    if (!voiceChan) return 'Invalid voice channel specified for this server! Ensure you have spelt it correctly.'

                    return Discord.client
                                  .joinVoiceChannel(voiceChan)
                                  .then(connection => {
                                      this.connections[server.id] = new VoiceConnection(connection, channel)
                                      return `Joined the voice channel '${voiceChan.name}' successfully! All notification updates will be sent to this channel, and any commands you wish to use to play music, etc, should be done in this channel. The volume is also set to the default of 15%.`
                                  })
                                  .catch(e => { return `There was an error joining voice... *${e}*` })
                }
            },
            'queue': {
                description: 'Outputs the current queue. Must be invoked in a bound text<->voice channel.',
                blockPM: true,
                handler: (params, author, channel, server) => {
                    if (!this.connections[server.id]) return

                    let nowPlaying = this.connections[server.id].nowPlaying
                      , queue      = this.connections[server.id].queue
                      , formatted  = `The current queue is as follows:\n**NP**: [${nowPlaying.type}] ${nowPlaying.name} *(requested by ${nowPlaying.requester.name})*\n`
                      , i          = 1
                    for (let t of queue) {
                        formatted += `**${i}**: [${t.type}] ${t.name} *(requested by ${t.requester.name})*\n`
                        i++
                    }
                    return formatted
                }
            },
            'nowplaying': {
                alias: ['np'],
                description: 'Outputs the current track playing. Must be invoked in a bound text<->voice channel.',
                blockPM: true,
                handler: (params, author, channel, server) => {
                    if (!this.connections[server.id]) return

                    let progress   = null // progress bar for yt videos
                      , connection = this.connections[server.id]
                    if (this.nowPlaying.type === 'YouTube' && connection.nowPlaying.length) {
                        let nowSeconds = Math.floor(connection.connection.streamTime / 1000) // to secs
                          , vidLength  = connection.nowPlaying.length
                          , vidMins    = String(vidLength % 60)
                          , nowMins    = String(nowSeconds % 60)
                        if (vidMins.length === 1) vidMins = `0${vidMins}`
                        if (nowMins.length === 1) nowMins = `0${nowMins}`

                        progress = `\n**`
                        // bar - calculate filled in chunks vs not
                        let filled = Math.floor(nowSeconds / vidLength * 20) // out of twenty chunks
                        for (let i = 1; i < filled; i++) progress += '-' // one less as special circle
                        progress += '○**'
                        for (let i = 0; i < (20 - filled); i++) progress += '-'
                        progress += ` \`${Math.floor(nowSeconds / 60)}:${nowMins}/${Math.floor(vidLength / 60)}:${vidMins}\``
                    }

                    return `**Now Playing**: [${connection.nowPlaying.type}] ${connection.nowPlaying.name} *(requested by ${connection.nowPlaying.requester.name})*${progress || ''}`
                }
            },
            'playdirectfile': {
                description: 'Direct passthrough to .playFile() for admin',
                permissionLevel: 3,
                hidden: true,
                handler: async (params, author, channel, server) => {
                    if (!this.connections[server.id]) return

                    let file = params.join(' ')
                      , name = file.split('/').pop()
                    this.connections[server.id].addToQueue({
                        file,
                        name,
                        type: 'LOCAL',
                        requester: author
                    })
                    return `**[ADMIN ACTION]** - Added a local file to queue: ${params.join(' ').split('/').pop()}`
                }
            },
            'play': {
                description: 'Queue a song for me to play in a voice channel. Text channel must be bound to a voice channel to work.',
                blockPM: true,
                reply: true,
                handler: async (params, author, channel, server) => {
                    if (!this.connections[server.id] || !params[0]) return

                    let lookup = params.join(' ')
                      , conn   = this.connections[server.id]


                    // Matching different resources
                    let urlmp3Lookup = /^https?:\/\/(.*)\/(.*?)\.mp3$/i.exec(lookup)
                    if (urlmp3Lookup) {
                        // url
                        conn.addToQueue({
                            file: lookup, // pass url direct to ffmpeg
                            type: 'URL-MP3',
                            name: `${urlmp3Lookup[2]}.mp3`,
                            requester: author
                        })
                        return `Added the URL **'${lookup}'** to the queue.`
                    }

                    let youtubeLookup = /youtu((be\.com\/watch\?v=)|(\.be\/))([A-Za-z0-9-_]+)/i.exec(lookup)
                    if (youtubeLookup) {
                        // youtube
                        try {
                            let info = await ytdl.getInfoAsync(`http://youtube.com/watch?v=${youtubeLookup[4]}`)
                              , stream = ytdl.downloadFromInfo(info, { quality: 140 })
                                             .on('error', e => {
                                                 if (e.code === 'ECONNRESET') return Discord.client.sendMessage(conn.textChannel, 'Hit a connection error to YouTube while trying to play the track, bot\'s connection to their servers may be unstable. Skipping to next video...')
                                                 Logging.mlog('VoiceH', `YTDL stream error - ${e}`)
                                                 // Discord.client.sendMessage(this.textChannel, 'There was a backend error during playback... please try again later.')
                                             })
                            conn.addToQueue({
                                stream, // 140 = opus audio
                                type: 'YouTube',
                                name: info.title && info.author ? `${info.title} (by ${info.author})` : `Video ID ${youtubeLookup[4]} [was unable to get metadata]`,
                                length: info.length_seconds,
                                requester: author
                            })
                            return `Added YouTube video **'${info.title}'** to the queue.`
                        }
                        catch (e) {
                            return 'Invalid YouTube link (in which case you are a jerk) or having problems connecting with the YouTube server...'
                        }
                    }


                    return `I do not know how to handle and play '${lookup}'. Please use a supported format.`
                }
            },
            'volume': {
                description: 'Sets the volume that MeowBot should play at (percentage based). When joining a voice channel, this defaults to 100%. Command must be used in a text<->voice bound channel.',
                permissionLevel: 1,
                blockPM: true,
                handler: (params, author, channel, server) => {
                    if (!this.connections[server.id] || !params[0]) return

                    let volume = Number(params[0].replace(/%$/, ''))
                    if (!volume) return 'Invalid volume to set, must be in the form of \'77[%]\'.'

                    this.connections[server.id].volume = volume / 100
                    this.connections[server.id].connection.setVolume(volume / 100)
                    return `Volume has been set to: ${volume}%`
                }
            },
            'skip': {
                description: 'Vote/start a vote to skip the currently playing track. Must be used in a text<->voice bound channel.',
                blockPM: true,
                handler: (params, author, channel, server) => {
                    if (!this.connections[server.id] || !params[0]) return

                    let conn = this.connections[server.id]
                    if (!conn.voting) {
                        // Starting a new vote.
                        let members = conn.connection.voiceChannel.members // voice channel members
                        if (!members.get('id', author.id)) return `${author.mention()}, you are not in the voice channel, you do not have a right to vote/start a vote.`

                        if (members.length === 2) {
                            // 2 members, only bot + user, just skip
                            conn.connection.stopPlaying()
                            return `${author.mention()}, you are the only member in the voice channel with me right now, skipping...`
                        }

                        // voting
                        conn.voting = {
                            author,
                            members: members.map(i => i.id), // lock the members by storing their IDs, any new members will be ignored to this vote
                            voted: [author.id], // only the author voted, obviously
                            votesRequired: Math.ceil((members.length - 1) / 2) // majority
                        }
                        conn.votingTimeout = setTimeout(() => {
                            let author = conn.voting.author
                            conn.voting = null
                            return `The vote started by ${author.name} has now timed out. A new vote must be started to skip the current track.`
                        }, 90 * 1000) // 90 second timeout
                        if (members.length === 3) conn.voting.votesRequired = 2 // bot + 2 users, 2 users one user vote is unfair, require 2

                        return `**${author.name} has voted to skip the current track** *(${conn.nowPlaying.name})*. Starting a vote with the current members of the voice channel. ${conn.voting.votesRequired} votes are required to skip. There is currently 1 vote. Time remaining: 90 second(s)`
                    } else {
                        // Using a current vote.
                        if (conn.voting.members.indexOf(author.id) < 0) {
                            // invalid user from those casted
                            return `${author.mention()}, you were not in the voice channel at the time the voting started. You do not have a right to vote in this round.`
                        }
                        if (conn.voting.voted.indexOf(author.id) > -1) {
                            return `${author.mention()}, you have already voted to skip for this round!`
                        }

                        conn.voting.voted.push(author.id)

                        if (conn.voting.voted.length >= conn.voting.votesRequired) {
                            clearTimeout(conn.votingTimeout)
                            conn.voting = null
                            conn.connection.stopPlaying()
                            return `**${author.name} has voted to skip the current track** *(${conn.nowPlaying.name})*. **VOTING SUCCEEDED, SKIPPING CURRENT TRACK.**`
                        }

                        return `**${author.name} has voted to skip the current track** *(${conn.nowPlaying.name})*. **Voting progress: ${conn.voting.voted.length}/${conn.voting.votesRequired} (${conn.voting.votesRequired - conn.voting.voted.length} votes still required).**`
                    }
                }
            },
            'fskip': {
                description: 'Forcefully skips the currently playing track.',
                permissionLevel: 1,
                blockPM: true,
                retry: true,
                handler: (params, author, channel, server) => {
                    if (!this.connections[server.id]) return
                    this.connections[server.id].connection.stopPlaying()
                    return '**[MOD ACTION]** Forcefully skipped the currently playing track.'
                }
            }
        }
    }
}

export default new Voice
