import ytdl from 'ytdl-core'
import thenify from 'thenify'

import Discord from '../Core/Discord'
import Logging from '../Core/Logging'

ytdl.getInfoAsync = thenify(ytdl.getInfo) // promise wrapper

class Voice {
    constructor() {
        if (Discord.client.voiceConnection) Discord.client.leaveVoiceChannel()

        this.textChannel = null
        this._nowPlaying = null
        this._intent = null
        this.queue = []
        this.volume = 1

        this.events = {
            'discord.disconnected': () => {
                // Disconnection ensure var reset
                this.textChannel = null
            }
        }
    }

    get intent() {
        return this._intent
    }

    set intent(intent) {
        if (intent instanceof require('discord.js/lib/Voice/StreamIntent')) {
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

    get commands() {
        return {
            'voice': {
                description: 'Joins a voice channel or leaves one if its already in it.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to make MeowBot join a voice channel.',
                reply: true,
                handler: (params, author, channel, data) => {
                    // leaving mechanism
                    if (data.channel.equals(this.textChannel)) {
                        return Discord.client
                                      .leaveVoiceChannel()
                                      .then(() => {
                                          this.textChannel = null
                                          this.queue = []
                                          return 'Left the voice channel.'
                                      })
                                      .catch(e => { return `There was an error leaving voice... *${e}*` })
                    }

                    if (!params[0]) return 'You need to specify a voice channel for me to join!'
                    if (Discord.client.voiceConnection) return 'I am currently in a voice channel of another channel/server, sorry!'

                    let chanName   = params.join(' ')
                      , voiceChan  = data.channel.server.channels.find(c => c.type === 'voice' && c.name === chanName)
                    if (!voiceChan) return 'Invalid voice channel specified! Ensure you have spelt it correctly.'

                    return Discord.client
                                  .joinVoiceChannel(voiceChan)
                                  .then(() => {
                                      this.textChannel = channel // Monitor this channel for play commands and stuff
                                      this.queue = []
                                      this.volume = 1
                                      return `Joined the voice channel '${voiceChan.name}' successfully! All notification updates will be sent to this channel, and any commands you wish to use to play music, etc, should be done in this channel.`
                                  })
                                  .catch(e => { return `There was an error joining voice... *${e}*` })
                }
            },
            'queue': {
                description: 'Outputs the current queue. Must be invoked in a bound text<->voice channel.',
                blockPM: true,
                handler: (params, author, channel) => {
                    if (!this.textChannel || !channel.equals(this.textChannel)) return

                    let formatted = `The current queue is as follows:\n**NP**: [${this.nowPlaying.type}] ${this.nowPlaying.name} *(requested by ${this.nowPlaying.requester.name})*\n`
                      , i         = 1
                    for (let t of this.queue) {
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
                handler: (params, author, channel) => {
                    if (!this.textChannel || !channel.equals(this.textChannel)) return
                    return `**Now Playing**: [${this.nowPlaying.type}] ${this.nowPlaying.name} *(requested by ${this.nowPlaying.requester.name})*`
                }
            },
            'playdirectfile': {
                description: 'Direct passthrough to .playFile() for admin',
                permissionLevel: 3,
                hidden: true,
                handler: async (params, author) => {
                    if (!Discord.client.voiceConnection) return

                    let file = params.join(' ')
                      , name = file.split('/').pop()
                    this.addToQueue({
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
                handler: async (params, author, channel) => {
                    if (!this.textChannel || !channel.equals(this.textChannel)) return

                    let lookup = params.join(' ')


                    // Matching different resources
                    let urlmp3Lookup = /^https?:\/\/(.*)\/(.*?)\.mp3$/i.exec(lookup)
                    if (urlmp3Lookup) {
                        // url
                        this.addToQueue({
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
                                                 if (e.code === 'ECONNRESET') return Discord.client.sendMessage(this.textChannel, 'Hit a connection error to YouTube while trying to play the track, bot\'s connection to their servers may be unstable. Skipping to next video...')
                                                 Logging.mlog('VoiceH', `YTDL stream error - ${e}`)
                                                 // Discord.client.sendMessage(this.textChannel, 'There was a backend error during playback... please try again later.')
                                             })
                            this.addToQueue({
                                stream, // 140 = opus audio
                                type: 'YouTube',
                                name: info.title && info.author ? `${info.title} (by ${info.author})` : `Video ID ${youtubeLookup[4]} [was unable to get metadata]`,
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
                handler: (params, author, channel) => {
                    if (!this.textChannel || !channel.equals(this.textChannel) || !params[0]) return

                    let volume = Number(params[0].replace(/%$/, ''))
                    if (!volume) return 'Invalid volume to set, must be in the form of \'77[%]\'.'

                    this.volume = volume / 100
                    Discord.client.voiceConnection.setVolume(volume / 100)
                    return `Volume has been set to: ${volume}%`
                }
            },
            'skip': {
                description: 'Vote/start a vote to skip the currently playing track. Must be used in a text<->voice bound channel.',
                blockPM: true,
                handler: (params, author, channel) => {
                    if (!this.textChannel || !channel.equals(this.textChannel)) return

                    if (!this.voting) {
                        // Starting a new vote.
                        let members = Discord.client.voiceConnection.voiceChannel.members // voice channel members
                        if (!members.get('id', author.id)) return `${author.mention()}, you are not in the voice channel, you do not have a right to vote/start a vote.`

                        if (members.length === 2) {
                            // 2 members, only bot + user, just skip
                            Discord.client.voiceConnection.stopPlaying()
                            return `${author.mention()}, you are the only member in the voice channel with me right now, skipping...`
                        }

                        // voting
                        this.voting = {
                            author,
                            members: members.map(i => i.id), // lock the members by storing their IDs, any new members will be ignored to this vote
                            voted: [author.id], // only the author voted, obviously
                            votesRequired: Math.ceil((members.length - 1) / 2) // majority
                        }
                        this.votingTimeout = setTimeout(() => {
                            let author = this.voting.author
                            this.voting = null
                            return `The vote started by ${author.name} has now timed out. A new vote must be started to skip the current track.`
                        }, 90 * 1000) // 90 second timeout
                        if (members.length === 3) this.voting.votesRequired = 2 // bot + 2 users, 2 users one user vote is unfair, require 2

                        return `**${author.name} has voted to skip the current track** *(${this.nowPlaying.name})*. Starting a vote with the current members of the voice channel. ${this.voting.votesRequired} votes are required to skip. There is currently 1 vote. Time remaining: 90 second(s)`
                    } else {
                        // Using a current vote.
                        if (this.voting.members.indexOf(author.id) < 0) {
                            // invalid user from those casted
                            return `${author.mention()}, you were not in the voice channel at the time the voting started. You do not have a right to vote in this round.`
                        }
                        if (this.voting.voted.indexOf(author.id) > -1) {
                            return `${author.mention()}, you have already voted to skip for this round!`
                        }

                        this.voting.voted.push(author.id)

                        if (this.voting.voted.length >= this.voting.votesRequired) {
                            clearTimeout(this.votingTimeout)
                            this.voting = null
                            Discord.client.voiceConnection.stopPlaying()
                            return `**${author.name} has voted to skip the current track** *(${this.nowPlaying.name})*. **VOTING SUCCEEDED, SKIPPING CURRENT TRACK.**`
                        }

                        return `**${author.name} has voted to skip the current track** *(${this.nowPlaying.name})*. **Voting progress: ${this.voting.voted.length}/${this.voting.votesRequired} (${this.voting.votesRequired - this.voting.voted.length} votes still required).**`
                    }
                }
            },
            'fskip': {
                description: 'Forcefully skips the currently playing track.',
                permissionLevel: 1,
                blockPM: true,
                retry: true,
                handler: () => {
                    if (!Discord.client.voiceConnection || !this.textChannel) return
                    Discord.client.voiceConnection.stopPlaying()
                    return '**[MOD ACTION]** Forcefully skipped the currently playing track.'
                }
            }
        }
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

        if (nowPlay.file) this.intent = await Discord.client.voiceConnection.playFile(nowPlay.file, { volume: this.volume })
        else this.intent = await Discord.client.voiceConnection.playRawStream(nowPlay.stream, { volume: this.volume })

        this.nowPlaying = nowPlay
    }
}

export default new Voice
