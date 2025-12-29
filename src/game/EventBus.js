// Event bus for React <-> Phaser communication
const EventBus = {
    events: {},

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = []
        }
        this.events[event].push(callback)
    },

    off(event, callback) {
        if (!this.events[event]) return
        this.events[event] = this.events[event].filter(cb => cb !== callback)
    },

    emit(event, data) {
        if (!this.events[event]) return
        this.events[event].forEach(callback => callback(data))
    },

    removeAllListeners() {
        this.events = {}
    }
}

export default EventBus
