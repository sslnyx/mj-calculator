import { supabase } from './supabase'

// Fan to points mapping (0-13 HK Mahjong)
const FAN_POINTS = {
    0: 1,    // 雞糊 (Chicken Hand)
    1: 2,
    2: 4,
    3: 8,
    4: 16,   // 滿糊 (Limit / Full - Low)
    5: 24,
    6: 32,
    7: 48,
    8: 64,
    9: 96,
    10: 128, // 細爆 (Small Limit)
    11: 192,
    12: 256,
    13: 384  // 爆棚 (Limit / Max)
}

// Calculate points for a given fan count
export const getPointsForFan = (fan) => {
    return FAN_POINTS[fan] || 0
}

// Update stats for ALL players in a round (Hexagon Warrior Metrics)
const updateRoomStats = async ({
    roomPlayers,
    winnerId,
    loserId,
    winType,
    fanCount,
    winnerPoints,
    loserPoints,
    handPatterns = []
}) => {
    for (const player of roomPlayers) {
        const pid = player.player_id

        // Fetch current stats
        const { data: stats } = await supabase
            .from('player_stats')
            .select('*')
            .eq('player_id', pid)
            .single()

        if (!stats) continue

        // Base update: everyone's round count increases
        const updates = {
            total_games: (stats.total_games || 0) + 1
        }

        // WINNER
        if (pid === winnerId) {
            const isZimo = winType === 'zimo' || winType === 'zimo_bao'
            // For zimo, winner gets (basePoints / 2) * 3
            // winnerPoints passed in should already be the BASE points
            const actualWinnerPoints = isZimo ? (winnerPoints / 2) * 3 : winnerPoints

            updates.total_wins = (stats.total_wins || 0) + 1
            updates.total_points_won = (stats.total_points_won || 0) + actualWinnerPoints
            updates.total_fan_value = (stats.total_fan_value || 0) + fanCount
            updates.highest_fan = Math.max(stats.highest_fan || 0, fanCount)

            if (isZimo) {
                updates.total_zimo = (stats.total_zimo || 0) + 1
            } else {
                updates.total_eat = (stats.total_eat || 0) + 1
            }

            // Limit hand tracking (Fan >= 10)
            if (fanCount >= 10) {
                updates.total_limit_hands = (stats.total_limit_hands || 0) + 1
            }

            // Track hand pattern counts
            if (handPatterns && handPatterns.length > 0) {
                const patternCounts = stats.hand_pattern_counts || {}
                handPatterns.forEach(patternId => {
                    patternCounts[patternId] = (patternCounts[patternId] || 0) + 1
                })
                updates.hand_pattern_counts = patternCounts
            }
        }
        // DEAL-IN LOSER
        else if (winType === 'eat' && pid === loserId) {
            updates.total_deal_ins = (stats.total_deal_ins || 0) + 1
            updates.total_points_lost = (stats.total_points_lost || 0) + loserPoints
        }
        // BAO LOSER - pays the full zimo amount
        else if (winType === 'zimo_bao' && pid === loserId) {
            updates.total_bao = (stats.total_bao || 0) + 1
            // Bao loser pays (basePoints / 2) * 3
            const baoLoss = (winnerPoints / 2) * 3
            updates.total_points_lost = (stats.total_points_lost || 0) + baoLoss
        }
        // ZIMO LOSER (everyone else pays half the base)
        else if (winType === 'zimo' && pid !== winnerId) {
            // Each loser pays (basePoints / 2)
            const share = winnerPoints / 2
            updates.total_points_lost = (stats.total_points_lost || 0) + share
        }

        await supabase
            .from('player_stats')
            .update(updates)
            .eq('player_id', pid)
    }
}

// Record a direct win (eat/dianpao)
export const recordDirectWin = async ({
    roomId,
    winnerId,
    loserId,
    fanCount,
    handPatterns = [],
    roomPlayers
}) => {
    const points = getPointsForFan(fanCount)

    // Create game round record
    const { data: round, error: roundError } = await supabase
        .from('game_rounds')
        .insert({
            room_id: roomId,
            round_number: 1,
            winner_id: winnerId,
            loser_id: loserId,
            win_type: 'eat',
            fan_count: fanCount,
            points: points,
            hand_patterns: handPatterns
        })
        .select()
        .single()

    if (roundError) throw roundError

    // Update player points in room
    const winner = roomPlayers.find(p => p.player_id === winnerId)
    const loser = roomPlayers.find(p => p.player_id === loserId)

    await supabase
        .from('room_players')
        .update({ current_points: (winner?.current_points || 0) + points })
        .eq('room_id', roomId)
        .eq('player_id', winnerId)

    await supabase
        .from('room_players')
        .update({ current_points: (loser?.current_points || 0) - points })
        .eq('room_id', roomId)
        .eq('player_id', loserId)

    // Update lifetime stats for ALL players
    await updateRoomStats({
        roomPlayers,
        winnerId,
        loserId,
        winType: 'eat',
        fanCount,
        winnerPoints: points,
        loserPoints: points,
        handPatterns
    })

    return { round, points }
}

// Record a self-draw win (zimo)
export const recordZimo = async ({
    roomId,
    winnerId,
    fanCount,
    handPatterns = [],
    baoPlayerId,
    roomPlayers
}) => {
    const basePoints = getPointsForFan(fanCount)
    const halfPoints = basePoints / 2
    const winnerPoints = halfPoints * 3

    // Create game round record
    const { data: round, error: roundError } = await supabase
        .from('game_rounds')
        .insert({
            room_id: roomId,
            round_number: 1,
            winner_id: winnerId,
            loser_id: baoPlayerId || null,
            win_type: baoPlayerId ? 'zimo_bao' : 'zimo',
            fan_count: fanCount,
            points: basePoints,
            hand_patterns: handPatterns
        })
        .select()
        .single()

    if (roundError) throw roundError

    const winner = roomPlayers.find(p => p.player_id === winnerId)

    // Update winner points
    await supabase
        .from('room_players')
        .update({ current_points: (winner?.current_points || 0) + winnerPoints })
        .eq('room_id', roomId)
        .eq('player_id', winnerId)

    if (baoPlayerId) {
        // Bao: One player pays all
        const baoPlayer = roomPlayers.find(p => p.player_id === baoPlayerId)
        await supabase
            .from('room_players')
            .update({ current_points: (baoPlayer?.current_points || 0) - winnerPoints })
            .eq('room_id', roomId)
            .eq('player_id', baoPlayerId)
    } else {
        // Standard Zimo: Everyone pays share
        for (const player of roomPlayers) {
            if (player.player_id !== winnerId) {
                await supabase
                    .from('room_players')
                    .update({ current_points: (player.current_points || 0) - halfPoints })
                    .eq('room_id', roomId)
                    .eq('player_id', player.player_id)
            }
        }
    }

    // Update lifetime stats for ALL players
    await updateRoomStats({
        roomPlayers,
        winnerId,
        loserId: baoPlayerId || null,
        winType: baoPlayerId ? 'zimo_bao' : 'zimo',
        fanCount,
        winnerPoints,
        loserPoints: winnerPoints,
        handPatterns
    })

    return { round, winnerPoints }
}
