import Discord from './Discord'
import Database from './Database'

class Tools {
    static hotUnload(filename) {
        if (require.cache[require.resolve(filename)]) {
            delete(require.cache[require.resolve(filename)])
            return true
        }
        return false
    }

    static checkOwnPermissions(server, permissions) {
        let role         = server.rolesOfUser(Discord.client.user).find(r => r.name === 'Meow')
          , missingRoles = []

        if (!role)
            return permissions

        for (let p of permissions) {
            if (!role.hasPermission(p))
                missingRoles.push(p)
        }

        if (missingRoles.length < 1)
            missingRoles = null

        return missingRoles
    }

    static camelToSpaced(str) {
        // https://stackoverflow.com/questions/4149276/javascript-camelcase-to-regular-form
        return str.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => { return str.toUpperCase() })
    }

    static reverse(str) {
        return str.split('').reverse().join('')
    }

    static reflect(promise) {
        // Promise reflecting
        // https://stackoverflow.com/questions/31424561/wait-until-all-es6-promises-complete-even-rejected-promises
        return promise.then((v) => { return { v, status: 'resolved' }},
                            (e) => { return { e, status: 'rejected' }})
    }

    static resolveMention(mention, channel) {
        // Resolves A SINGLE mention with the internal discord.js resolver IF THE MENTION IS VALID (save some cpu, eh? ...)
        if (/^<@!?\d+>$/.test(mention)) {
            // User mention
            let mentions = Discord.client.internal.resolver.resolveMentions(mention, channel)

            if (mentions.length < 1 || mentions[0].length < 1)
                return null

            return mentions[0][0]
        }

        // channel resolving
        let channelLookup = /^<#(\d+)>$/.exec(mention)
        if (channelLookup) {
            // Channel mention
            let channel = Discord.client.channels.find(c => c.id === channelLookup[1])

            if (!channel)
                return null

            return channel
        }

        return null
    }

    static getRandomInt(min, max) { // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
        return Math.floor(Math.random() * (max - min)) + min
    }

    static async deleteIfBlankDBRow(server, row) { // Detect a blank row, only these two columns should be filled
        if ('server' in row && '_id' in row) {
            await Database.Servers.remove({ server: server.id })
            return true
        }

        return false
    }
}

export default Tools
