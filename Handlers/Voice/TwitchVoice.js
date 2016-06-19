import Logging from '../../Core/Logging'

import cpoc from 'child_process'

class TwitchVoice {
    // this stuff *loosely* based off discord.js's own AudioEncoder
    static checkCapability() {
        let c = cpoc.spawnSync('livestreamer')
        if (c.error)
            return false
        return true
    }

    static getNodeStream(channel) {
        return new Promise((resolve, reject) => {
            Logging.mlog('VoiceH/Twitch', `Spawning livestreamer for twitch audio stream of: '${channel}'`)
            let proc = cpoc.spawn('livestreamer', [
                '-O', '-Q', // stdout, quiet
                `twitch.tv/${channel}`, 'audio'
            ])

            let data = {
                channel,
                proc,
                stream: proc.stdout,
                killed: false
            }

            proc.stdout.once('readable', () => {
                Logging.mlog('VoiceH/Twitch', `'${channel}' stream should be good to go, resolving`)
                resolve(data)
            })

            proc.stdout.once('end', () => this.cleanup(data))
            proc.stdout.once('error', e => this.cleanup(data, e))
        })
    }

    static cleanup(data, err) {
        if (data.killed)
            return

        if (err)
            Logging.mlog('VoiceH/Twitch', `There was an error with twitch audio stream of '${data.channel}' - \n${err}`)
        Logging.mlog('VoiceH/Twitch', `Cleaning up livestreamer process for twitch stream: '${data.channel}'`)
        data.proc.kill('SIGKILL')
        data.killed = true
    }
}

export default TwitchVoice