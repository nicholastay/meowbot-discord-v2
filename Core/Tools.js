let Tools = {
    hotUnload: (filename) => {
        if (require.cache[require.resolve(filename)]) {
            delete(require.cache[require.resolve(filename)])
            return true
        }
        return false
    }
}

export default Tools
