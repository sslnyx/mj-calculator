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

/**
 * Calculate winner points based on win type - SINGLE SOURCE OF TRUTH
 * @param {number} basePoints - Base points from fan count
 * @param {string} winType - 'eat', 'zimo', or 'zimo_bao'
 * @returns {number} - Actual points the winner receives
 */
export const getWinnerPoints = (basePoints, winType) => {
    const isZimo = winType === 'zimo' || winType === 'zimo_bao'
    return isZimo ? (basePoints / 2) * 3 : basePoints
}

/**
 * Calculate point changes for a single round - THE SINGLE SOURCE OF TRUTH
 * @param {Object} round - game_rounds record
 * @param {Object} seatMap - { player_id: seat_position }
 * @returns {Object} - { seat_position: point_change }
 */
export const calculateRoundChanges = (round, seatMap) => {
    const basePoints = round.points
    const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
    const winnerId = round.winner_id
    const loserId = round.loser_id

    const changes = { 1: 0, 2: 0, 3: 0, 4: 0 }
    const winnerSeat = seatMap[winnerId]
    const loserSeat = seatMap[loserId]

    if (isZimo) {
        const halfPoints = basePoints / 2
        const winnerGain = halfPoints * 3

        if (winnerSeat) {
            changes[winnerSeat] = winnerGain
        }

        if (round.win_type === 'zimo_bao' && loserSeat) {
            // Bao: only loser pays winner
            changes[loserSeat] = -winnerGain
        } else {
            // Normal zimo: everyone else pays half
            [1, 2, 3, 4].forEach(seat => {
                if (seat !== winnerSeat) {
                    changes[seat] = -halfPoints
                }
            })
        }
    } else {
        // Eat: winner gets base, loser loses base
        if (winnerSeat) {
            changes[winnerSeat] = basePoints
        }
        if (loserSeat) {
            changes[loserSeat] = -basePoints
        }
    }

    return changes
}

/**
 * Calculate score totals from game rounds - SINGLE SOURCE OF TRUTH
 * @param {Array} rounds - Array of game_rounds records
 * @param {Array} players - Array of room_players with player_id and seat_position
 * @returns {Object} - { [seat_position]: total_points }
 */
export const calculateScoreTotals = (rounds, playersOrSeatMap) => {
    // Build seat lookup if array provided
    let seatMap = {}
    if (Array.isArray(playersOrSeatMap)) {
        playersOrSeatMap.forEach(p => {
            seatMap[p.player_id] = p.seat_position
        })
    } else {
        seatMap = playersOrSeatMap
    }

    // Initialize totals by seat position
    const totals = { 1: 0, 2: 0, 3: 0, 4: 0 }

    rounds.forEach(round => {
        const changes = calculateRoundChanges(round, seatMap)
        Object.keys(changes).forEach(seat => {
            totals[seat] += changes[seat] || 0
        })
    })

    return totals
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

    // === Update Current Points in DB ===
    // We update BOTH room_players AND vacated_seats to ensure balance
    const updatePoints = async (pid, change) => {
        // Try active players first
        const { data: updatedPlayer } = await supabase
            .from('room_players')
            .select('current_points')
            .eq('room_id', roomId)
            .eq('player_id', pid)
            .single()

        if (updatedPlayer) {
            await supabase
                .from('room_players')
                .update({ current_points: (updatedPlayer.current_points || 0) + change })
                .eq('room_id', roomId)
                .eq('player_id', pid)
        } else {
            // Try vacated seats
            const { data: updatedVacated } = await supabase
                .from('vacated_seats')
                .select('current_points')
                .eq('room_id', roomId)
                .eq('player_id', pid)
                .single()

            if (updatedVacated) {
                await supabase
                    .from('vacated_seats')
                    .update({ current_points: (updatedVacated.current_points || 0) + change })
                    .eq('room_id', roomId)
                    .eq('player_id', pid)
            }
        }
    }

    await updatePoints(winnerId, points)
    await updatePoints(loserId, -points)

    // Fetch vacated seats to include in stats update
    const { data: vacatedSeats } = await supabase
        .from('vacated_seats')
        .select('player_id, seat_position, current_points')
        .eq('room_id', roomId)

    // Merge active + vacated players for complete stats update
    const allPlayers = [
        ...roomPlayers,
        ...(vacatedSeats || []).map(vs => ({
            player_id: vs.player_id,
            seat_position: vs.seat_position,
            current_points: vs.current_points
        }))
    ]

    // Update lifetime stats for ALL players (including vacated)
    await updateRoomStats({
        roomPlayers: allPlayers,
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

    // === Update Current Points in DB ===
    const updatePoints = async (pid, change) => {
        const { data: updatedPlayer } = await supabase
            .from('room_players')
            .select('current_points')
            .eq('room_id', roomId)
            .eq('player_id', pid)
            .single()

        if (updatedPlayer) {
            await supabase
                .from('room_players')
                .update({ current_points: (updatedPlayer.current_points || 0) + change })
                .eq('room_id', roomId)
                .eq('player_id', pid)
        } else {
            const { data: updatedVacated } = await supabase
                .from('vacated_seats')
                .select('current_points')
                .eq('room_id', roomId)
                .eq('player_id', pid)
                .single()

            if (updatedVacated) {
                await supabase
                    .from('vacated_seats')
                    .update({ current_points: (updatedVacated.current_points || 0) + change })
                    .eq('room_id', roomId)
                    .eq('player_id', pid)
            }
        }
    }

    // Winner gains
    await updatePoints(winnerId, winnerPoints)

    if (baoPlayerId) {
        // Bao: One player pays all
        await updatePoints(baoPlayerId, -winnerPoints)
    } else {
        // Standard Zimo: Use historical seat map if possible, but for current game
        // we pay based on the seats. We need to identify who is in seats 1-4.
        const allSeats = [1, 2, 3, 4]
        // Get winner's seat
        const winnerSeat = roomPlayers.find(p => p.player_id === winnerId)?.seat_position

        // We need to charge every other seat, even if the player is currently vacated
        // The recordZimo function has roomPlayers, but it might not have the vacated ones.
        // For standard Zimo, we'll try to find whoever is in the other seats.

        // Fetch all current occupants including vacated
        const { data: currentVacated } = await supabase
            .from('vacated_seats')
            .select('player_id, seat_position')
            .eq('room_id', roomId)

        for (const seat of allSeats) {
            if (seat === winnerSeat) continue

            // Pay share
            const share = halfPoints

            // Check active room_players
            const activeP = roomPlayers.find(p => p.seat_position === seat)
            if (activeP) {
                await updatePoints(activeP.player_id, -share)
            } else {
                // Check vacated
                const vacatedP = currentVacated?.find(v => v.seat_position === seat)
                if (vacatedP) {
                    await updatePoints(vacatedP.player_id, -share)
                }
            }
        }
    }

    // Merge active + vacated players for complete stats update
    const allPlayers = [
        ...roomPlayers,
        ...(currentVacated || []).map(vs => ({
            player_id: vs.player_id,
            seat_position: vs.seat_position,
            current_points: 0 // Not needed for stats, just structure
        }))
    ]

    // Update lifetime stats for ALL players (including vacated)
    await updateRoomStats({
        roomPlayers: allPlayers,
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
