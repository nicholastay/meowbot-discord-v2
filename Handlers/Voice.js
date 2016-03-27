import request from 'request'
import ytdl from 'ytdl-core'
import thenify from 'thenify'

import Discord from '../Core/Discord'

ytdl.getInfoAsync = thenify(ytdl.getInfo) // promise wrapper

class Voice {
    constructor() {
        if (Discord.client.voiceConnection) Discord.client.leaveVoiceChannel()

        this.textChannel = null
        this._nowPlaying = null
        this._intent = null
        this.queue = []
    }

    get intent() {
        return this._intent
    }

    set intent(intent) {
        if (intent instanceof require('discord.js/lib/Voice/StreamIntent')) {
            intent.on('end', () => {
                this.intent = null
                this.nowPlaying = null
                this.playNext()
            })
        }
        this._intent = intent
    }

    get nowPlaying() {
        return this._nowPlaying
    }

    set nowPlaying(data) {
        Discord.sendMessage(this.textChannel, `**Now Playing**: **[${data.type}] ${data.name}** *(requested by ${data.requester.name})*`)
        this._nowPlaying = data
    }

    get commands() {
        return {
            'voice': {
                description: 'Joins a voice channel or leaves one if its already in it.',
                permissionLevel: 1,
                pm: false,
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
                                      return `Joined the voice channel '${voiceChan.name}' successfully! All notification updates will be sent to this channel, and any commands you wish to use to play music, etc, should be done in this channel.`
                                  })
                                  .catch(e => { return `There was an error joining voice... *${e}*` })
                }
            },
            'queue': {
                description: 'Outputs the current queue. Must be invoked in a bound text<->voice channel.',
                pm: false,
                handler: (params, author, channel) => {
                    if (!this.textChannel || !channel.equals(this.textChannel)) return

                    let formatted = `The current queue is as follows:\n**NP**: [${this.nowPlaying.type}] ${this.nowPlaying.name} *(requested by ${this.nowPlaying.requester.name})*`
                      , i         = 1
                    for (let t of this.queue) {
                        formatted += `**${i}**: [${t.type}] ${t.name} *(requested by ${t.requester.name})*\n`
                        i++
                    }
                    return formatted
                }
            },
            'playdirectfile': {
                description: 'Direct passthrough to .playFile() for admin',
                permissionLevel: 3,
                hidden: true,
                pm: false,
                handler: async (params) => {
                    if (!Discord.client.voiceConnection) return
                    this.intent = await Discord.client.voiceConnection.playFile(params.join(' '))
                    return `**[ADMIN ACTION]** - Directly playing: ${params.join(' ')}`
                }
            },
            'play': {
                description: 'Queue a song for me to play in a voice channel. Text channel must be bound to a voice channel to work.',
                pm: false,
                reply: true,
                handler: async (params, author, channel) => {
                    if (!this.textChannel || !channel.equals(this.textChannel)) return

                    let lookup = params.join(' ')


                    // Matching'
                    let urlmp3Lookup = /^https?:\/\/(.*)\/(.*?)\.mp3$/i.exec(lookup)
                    if (urlmp3Lookup) {
                        // url
                        this.addToQueue({
                            stream: request(lookup),
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
                            this.addToQueue({
                                stream: ytdl.downloadFromInfo(info, { quality: 140 }), // 140 = opus audio
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

        this.intent = await Discord.client.voiceConnection.playRawStream(nowPlay.stream)
        this.nowPlaying = nowPlay
    }
}

export default new Voice
