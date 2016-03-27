import Discord from './Discord'

const Tools = {
    hotUnload: (filename) => {
        if (require.cache[require.resolve(filename)]) {
            delete(require.cache[require.resolve(filename)])
            return true
        }
        return false
    },
    checkOwnPermissions: (server, permissions) => {
        let role         = server.rolesOfUser(Discord.client.user).find(r => r.name === 'Meow')
          , missingRoles = []

        if (!role) return permissions

        for (let p of permissions) {
            if (!role.hasPermission(p)) missingRoles.push(p)
        }
        if (missingRoles.length < 1) missingRoles = null

        return missingRoles
    },
    camelToSpaced: (str) => {
        // https://stackoverflow.com/questions/4149276/javascript-camelcase-to-regular-form
        return str.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => { return str.toUpperCase() })
    },
    reflect: (promise) => {
        // Promise reflecting
        // https://stackoverflow.com/questions/31424561/wait-until-all-es6-promises-complete-even-rejected-promises
        return promise.then((v) => { return { v, status: 'resolved' }},
                            (e) => { return { e, status: 'rejected' }})
    }
}

export default Tools
