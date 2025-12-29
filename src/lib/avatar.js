/**
 * DiceBear Avatar Utilities
 * Uses the Dylan style for pop-art/comics aesthetic
 */

// Pop-art inspired background colors
const AVATAR_BACKGROUNDS = [
    'ffcc00', // Yellow
    'ff6b6b', // Red/Coral
    '4ecdc4', // Cyan
    'ff9ff3', // Pink
    '54a0ff', // Blue
    '5f27cd', // Purple
    'ff9f43', // Orange
    '00d2d3', // Teal
    'ee5a24', // Dark Orange
    '01a3a4', // Dark Cyan
]

/**
 * Generate a DiceBear Dylan avatar URL
 * @param {string} seed - The seed for avatar generation (player ID or custom seed)
 * @param {object} options - Additional options
 * @returns {string} The avatar URL
 */
export const getDiceBearAvatar = (seed, options = {}) => {
    const {
        size = 128,
        backgroundColor = null,
        radius = 50, // Fully rounded
    } = options

    // Build URL parameters
    const params = new URLSearchParams()
    params.set('seed', seed || 'default')
    params.set('radius', radius.toString())

    if (size) {
        params.set('size', size.toString())
    }

    if (backgroundColor) {
        params.set('backgroundColor', backgroundColor)
    } else {
        // Use pop-art colors as background options
        params.set('backgroundColor', AVATAR_BACKGROUNDS.join(','))
    }

    return `https://api.dicebear.com/9.x/dylan/svg?${params.toString()}`
}

/**
 * Get the avatar URL for a player
 * Prioritizes: avatar_seed > avatar_url (Google) > player ID fallback
 * @param {object} player - Player object with id, avatar_seed, avatar_url
 * @param {number} size - Avatar size in pixels
 * @returns {string} The avatar URL
 */
export const getPlayerAvatar = (player, size = 128) => {
    if (!player) return getDiceBearAvatar('unknown', { size })

    // If player has a custom DiceBear seed, use it
    if (player.avatar_seed) {
        return getDiceBearAvatar(player.avatar_seed, { size })
    }

    // Fallback to Google avatar if available
    if (player.avatar_url) {
        return player.avatar_url
    }

    // Last resort: use player ID as seed
    return getDiceBearAvatar(player.id || player.display_name || 'player', { size })
}

/**
 * Generate a random seed for avatar randomization
 * @returns {string} A random seed string
 */
export const generateRandomSeed = () => {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

/**
 * Get preview avatars for the avatar picker
 * @param {number} count - Number of previews to generate
 * @returns {Array} Array of { seed, url } objects
 */
export const getAvatarPreviews = (count = 12) => {
    const previews = []
    for (let i = 0; i < count; i++) {
        const seed = generateRandomSeed()
        previews.push({
            seed,
            url: getDiceBearAvatar(seed, { size: 96 })
        })
    }
    return previews
}

export default {
    getDiceBearAvatar,
    getPlayerAvatar,
    generateRandomSeed,
    getAvatarPreviews,
    AVATAR_BACKGROUNDS
}
