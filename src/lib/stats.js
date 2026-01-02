/**
 * Centralized player statistics calculation functions
 * Single source of truth for win rate, avg fan, hexagon data, etc.
 */

// Minimum games required for validated statistics
const MIN_GAMES_FOR_STATS = 10

// Pattern weights for the "Magic" hexagon stat
const PATTERN_WEIGHTS = {
    // Limit hands (high weight)
    shi_san_yao: 5, jiu_lian_bao_deng: 5, da_si_xi: 5, da_san_yuan: 5, zi_yi_se: 4, kan_kan_hu: 4,
    // High value
    qing_yi_se: 3, xiao_san_yuan: 3,
    // Medium value
    hun_yi_se: 2, dui_dui_hu: 2, hua_hu: 2,
    // Others
    ping_hu: 1, wu_hua: 1, fan_zi: 1, qiang_gang: 2, gang_shang_hua: 2, hai_di_lao_yue: 2
}

/**
 * Check if a player has enough games for validated statistics
 * @param {Object} stats - player_stats record
 * @returns {boolean}
 */
export const hasEnoughGames = (stats) => {
    return (stats?.total_games || 0) > MIN_GAMES_FOR_STATS
}

/**
 * Get win rate for a player
 * @param {Object} stats - player_stats record
 * @returns {string|null} - Formatted win rate (e.g., "25.5") or null if not enough games
 */
export const getWinRate = (stats) => {
    if (!hasEnoughGames(stats)) return null
    const rounds = stats.total_games || 1
    const rate = ((stats.total_wins || 0) / rounds) * 100
    return rate.toFixed(1)
}

/**
 * Get average fan for a player
 * @param {Object} stats - player_stats record
 * @returns {string|null} - Formatted avg fan (e.g., "4.2") or null if not enough games
 */
export const getAvgFan = (stats) => {
    if (!hasEnoughGames(stats)) return null
    const wins = stats.total_wins || 1
    if (wins === 0) return null
    const avgFan = (stats.total_fan_value || 0) / wins
    return avgFan.toFixed(1)
}

/**
 * Get net points (won - lost)
 * @param {Object} stats - player_stats record
 * @returns {number}
 */
export const getNetPoints = (stats) => {
    return (stats?.total_points_won || 0) - (stats?.total_points_lost || 0)
}

/**
 * Calculate hexagon chart data for player radar chart
 * @param {Object} stats - player_stats record
 * @returns {number[]} - [speed, attack, defense, luck, magic, sanity] (0-100 scale)
 */
export const calculateHexagonData = (stats) => {
    if (!stats) return [0, 0, 0, 0, 0, 0]

    const rounds = stats.total_games || 1
    const wins = stats.total_wins || 1
    const enoughGames = hasEnoughGames(stats)

    // Speed: Win Rate (35% = 100%)
    const winRateVal = ((stats.total_wins || 0) / rounds) * 100
    const speed = enoughGames ? Math.min(100, (winRateVal / 35) * 100) : 0

    // Attack: Avg Fan (8 fan = 100%)
    const avgFanVal = (stats.total_fan_value || 0) / wins
    const attack = enoughGames ? Math.min(100, (avgFanVal / 8) * 100) : 0

    // Defense: Deal-in Avoidance (0% = 100%, 40% = 0%)
    const dealInRate = ((stats.total_deal_ins || 0) / rounds) * 100
    const defense = Math.max(0, 100 - (dealInRate / 40) * 100)

    // Luck: Zimo Rate (70% = 100%)
    const zimoRate = ((stats.total_zimo || 0) / wins) * 100
    const luck = Math.min(100, (zimoRate / 70) * 100)

    // Magic: Pattern diversity & special hands
    const limitRate = ((stats.total_limit_hands || 0) / wins) * 100
    const limitScore = Math.min(50, (limitRate / 15) * 50)

    let patternScore = 0
    if (stats.hand_pattern_counts) {
        Object.entries(stats.hand_pattern_counts).forEach(([pattern, count]) => {
            patternScore += (PATTERN_WEIGHTS[pattern] || 1) * count
        })
    }
    const patternContribution = Math.min(50, (patternScore / 25) * 50)
    const magic = Math.min(100, limitScore + patternContribution)

    // Sanity: Bao Avoidance (0% = 100%, 10% = 0%)
    const baoRate = ((stats.total_bao || 0) / rounds) * 100
    const sanity = Math.max(0, 100 - (baoRate / 10) * 100)

    return [speed, attack, defense, luck, magic, sanity]
}
