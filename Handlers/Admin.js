import axios from 'axios'
import fs from 'fs'
import path from 'path'
import thenify from 'thenify'

import Config from '../Core/Config'
// -- These are imported below for our eval!
// import Database from '../Core/Database'
// import Handlers from '../Core/Handlers'
// import Tools from '../Core/Tools'

const readFileAsync = thenify(fs.readFile) // readFile promise wrapper

/*eslint-disable no-unused-vars */ // shh eslint we need these vars for eval
const Discord  = require('../Core/Discord')
    , Database = require('../Core/Database')
    , Handlers = require('../Core/Handlers')
    , Tools    = require('../Core/Tools')

class Admin {
    get commands() {
        return {
            'exec': {
                description: 'Executes a raw JavaScript command and returns the output.',
                hidden: true,
                permissionLevel: 3,
                requireParams: true,
                requireParamsResponse: null,
                handler: (params, author, channel, message) => {
                    let silent = false
                    if (params[params.length-1] === '-%s') {
                        silent = true
                        params.pop()
                    }

                    let resp

                    try {
                        resp = eval(params.join(' '))
                    }
                    catch (e) {
                        resp = e
                    }

                    if (silent)
                        return

                    // shutup eslint because it just looks cleaner without the weird template string workarounds
                    return '```\n' + resp + '\n```' // eslint-disable-line prefer-template
                }
            },
            'setavatar': { /*eslint-enable no-unused-vars */
                description: 'Sets the avatar of the bot using a file on the local system, or a url.',
                hidden: true,
                permissionLevel: 3,
                requireParams: true,
                handler: async (params, author, channel) => {
                    let resource = params.join(' ')
                      , b64data  = null

                    Discord.sendMessage(channel, 'One sec, grabbing and uploading picture...')

                    if (/^https?:\/\//.test(resource))
                        b64data = (await axios.get(resource, { responseType: 'arraybuffer' })).data // URL
                    else
                        b64data = await readFileAsync(resource) // File

                    return Discord.client.setAvatar(b64data)
                                         .then(() => { return 'New avatar sucessfully set.' })
                }
            },
            'setname': {
                description: 'Changes the name of the bot itself.',
                hidden: true,
                permissionLevel: 3,
                requireParams: true,
                handler: async (params) => {
                    return Discord.client.setUsername(params.join(' '))
                                         .then(() => { return 'New username sucessfully set.' })
                }
            },
            'ignoreuser': {
                description: 'Ignore those little 12vies who cannot control themselves from spamming the bot. (or unignore them...)',
                permissionLevel: 3,
                requireParams: true,
                reply: true,
                handler: async (params, author, channel) => {
                    let user = Tools.resolveMention(params.join(' '), channel)
                    if (!user)
                        return 'You need to mention the user to be ignored...'

                    if (user.id === Discord.client.user.id)
                        return 'You cannot mute me, I am the one serving you after all you know...'

                    if ((Config.admins || []).indexOf(user.id) > -1)
                        return 'You cannot ignore a MeowBot admin user...'

                    let ignore = true
                    if (Handlers.ignoredUsers.indexOf(user.id) > -1) {
                        // unignore
                        Handlers.ignoredUsers.splice(Handlers.ignoredUsers.indexOf(user.id), 1)
                        ignore = false
                    } else {
                        // ignore
                        Handlers.ignoredUsers.push(user.id)
                    }
                    
                    fs.writeFileSync(path.join(Database._storesPath, 'ignored_users.txt'), Handlers.ignoredUsers.join('\n'))
                    
                    if (ignore)
                        return 'The user was successfully ignored from the entirety of the bot.'
                    else
                        return 'The user was successfully unignored from the bot.'
                }
            }
        }
    }
}

export default new Admin
