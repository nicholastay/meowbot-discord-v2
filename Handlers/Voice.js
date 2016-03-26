import Discord from '../Core/Discord'

class Voice {
    constructor() {
        this.textChannel = null
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
                                      this.textChannel = data.channel // Monitor this channel for play commands and stuff
                                      return `Joined the voice channel '${voiceChan.name}' successfully! All notification updates will be sent to this channel, and any commands you wish to use to play music, etc, should be done in this channel.`
                                  })
                                  .catch(e => { return `There was an error joining voice... *${e}*` })
                }
            }
        }
    }
}

export default new Voice
