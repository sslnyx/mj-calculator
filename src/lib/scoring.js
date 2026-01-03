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
// Optimized: Uses Promise.all for parallel operations
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
    try {
        // 1. Fetch all player stats in parallel
        const statsResults = await Promise.all(
            roomPlayers.map(player => {
                if (player.is_spectator) return Promise.resolve({ data: null, error: null })
                return supabase
                    .from('player_stats')
                    .select('*')
                    .eq('player_id', player.player_id)
                    .single()
            })
        )

        // 2. Build update operations
        const updateOps = []

        roomPlayers.forEach((player, index) => {
            const pid = player.player_id
            if (player.is_spectator) return // Skip spectators

            const { data: stats, error: fetchError } = statsResults[index]

            if (fetchError || !stats) {
                console.error(`Error fetching stats for player ${pid}:`, fetchError)
                return
            }

            // Base update: everyone's round count increases
            const updates = {
                total_games: (stats.total_games || 0) + 1,
                total_rounds_played: (stats.total_rounds_played || 0) + 1
            }



            // WINNER
            if (pid === winnerId) {
                // NOTE: winnerPoints is already the correct amount for the winner
                // For zimo: it's already (basePoints/2)*3
                // For eat: it's already basePoints
                // DO NOT recalculate here!
                const isZimo = winType === 'zimo' || winType === 'zimo_bao'

                updates.total_wins = (stats.total_wins || 0) + 1
                updates.total_points_won = (stats.total_points_won || 0) + winnerPoints
                updates.total_fan_value = (stats.total_fan_value || 0) + fanCount
                updates.highest_fan = Math.max(stats.highest_fan || 0, fanCount)

                if (isZimo) {
                    updates.total_zimo = (stats.total_zimo || 0) + 1
                } else {
                    updates.total_eat = (stats.total_eat || 0) + 1
                }

                if (fanCount >= 10) {
                    updates.total_limit_hands = (stats.total_limit_hands || 0) + 1
                }

                if (handPatterns && handPatterns.length > 0) {
                    const patternCounts = { ...(stats.hand_pattern_counts || {}) }
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
            // BAO LOSER
            else if (winType === 'zimo_bao' && pid === loserId) {
                updates.total_bao = (stats.total_bao || 0) + 1
                // For bao, loserPoints is passed as winnerPoints (the full amount)
                updates.total_points_lost = (stats.total_points_lost || 0) + loserPoints
            }
            // ZIMO LOSER (each non-winner pays half of base points)
            else if (winType === 'zimo' && pid !== winnerId) {
                // loserPoints is passed as basePoints/2 (the share each loser pays)
                updates.total_points_lost = (stats.total_points_lost || 0) + loserPoints
            }

            updateOps.push(
                supabase
                    .from('player_stats')
                    .update(updates)
                    .eq('player_id', pid)
                    .then(({ error }) => {
                        if (error) console.error(`Error updating stats for player ${pid}:`, error)
                        return { pid, error }
                    })
            )
        })

        // 3. Execute all updates in parallel
        if (updateOps.length > 0) {
            await Promise.all(updateOps)
        }
    } catch (err) {
        console.error('Critical error in updateRoomStats:', err)
        // We don't throw here to avoid failing the whole round record process 
        // if just stats fail, but we log it.
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
    try {
        const points = getPointsForFan(fanCount)

        // 1. Create game round record
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

        if (roundError) {
            console.error('Error creating round:', roundError)
            throw new Error(`Failed to create round: ${roundError.message}`)
        }

        // 2. Update Current Points in DB
        const updatePoints = async (pid, change) => {
            if (!pid) return

            // Try active players first
            const { data: updatedPlayer, error: fetchError } = await supabase
                .from('room_players')
                .select('current_points')
                .eq('room_id', roomId)
                .eq('player_id', pid)
                .single()

            if (updatedPlayer) {
                const { error: updateError } = await supabase
                    .from('room_players')
                    .update({ current_points: (updatedPlayer.current_points || 0) + change })
                    .eq('room_id', roomId)
                    .eq('player_id', pid)
                if (updateError) console.error(`Error updating room_players point for ${pid}:`, updateError)
            } else {
                // Try vacated seats
                const { data: updatedVacated, error: fetchVacatedError } = await supabase
                    .from('vacated_seats')
                    .select('current_points')
                    .eq('room_id', roomId)
                    .eq('player_id', pid)
                    .single()

                if (updatedVacated) {
                    const { error: updateVacatedError } = await supabase
                        .from('vacated_seats')
                        .update({ current_points: (updatedVacated.current_points || 0) + change })
                        .eq('room_id', roomId)
                        .eq('player_id', pid)
                    if (updateVacatedError) console.error(`Error updating vacated_seats point for ${pid}:`, updateVacatedError)
                } else {
                    console.error(`Player ${pid} not found in room_players or vacated_seats`)
                }
            }
        }

        await Promise.all([
            updatePoints(winnerId, points),
            updatePoints(loserId, -points)
        ])

        // 3. Fetch vacated seats to include in stats update
        const { data: vacatedSeats, error: vacatedError } = await supabase
            .from('vacated_seats')
            .select('player_id, seat_position, current_points')
            .eq('room_id', roomId)

        if (vacatedError) console.error('Error fetching vacated seats for stats update:', vacatedError)

        // Merge active + vacated players for complete stats update
        const allPlayers = [
            ...roomPlayers,
            ...(vacatedSeats || []).map(vs => ({
                player_id: vs.player_id,
                seat_position: vs.seat_position,
                current_points: vs.current_points
            }))
        ]

        // 4. Update lifetime stats for ALL players (including vacated)
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
    } catch (err) {
        console.error('Failed to record direct win:', err)
        throw err
    }
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
    try {
        const basePoints = getPointsForFan(fanCount)
        const halfPoints = basePoints / 2
        const winnerPoints = halfPoints * 3

        // 1. Create game round record
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

        if (roundError) {
            console.error('Error creating zimo round:', roundError)
            throw new Error(`Failed to create zimo round: ${roundError.message}`)
        }

        // 2. Update Current Points in DB
        const updatePoints = async (pid, change) => {
            if (!pid) return

            // Try active players first
            const { data: updatedPlayer, error: fetchError } = await supabase
                .from('room_players')
                .select('current_points')
                .eq('room_id', roomId)
                .eq('player_id', pid)
                .single()

            if (updatedPlayer) {
                const { error: updateError } = await supabase
                    .from('room_players')
                    .update({ current_points: (updatedPlayer.current_points || 0) + change })
                    .eq('room_id', roomId)
                    .eq('player_id', pid)
                if (updateError) console.error(`Error updating room_players point for ${pid}:`, updateError)
            } else {
                // Try vacated seats
                const { data: updatedVacated, error: fetchVacatedError } = await supabase
                    .from('vacated_seats')
                    .select('current_points')
                    .eq('room_id', roomId)
                    .eq('player_id', pid)
                    .single()

                if (updatedVacated) {
                    const { error: updateVacatedError } = await supabase
                        .from('vacated_seats')
                        .update({ current_points: (updatedVacated.current_points || 0) + change })
                        .eq('room_id', roomId)
                        .eq('player_id', pid)
                    if (updateVacatedError) console.error(`Error updating vacated_seats point for ${pid}:`, updateVacatedError)
                } else {
                    console.error(`Player ${pid} not found in room_players or vacated_seats`)
                }
            }
        }

        // Winner gains
        await updatePoints(winnerId, winnerPoints)

        // Fetch vacated seats for both point updates and stats updates
        const { data: currentVacated, error: fetchVacatedError } = await supabase
            .from('vacated_seats')
            .select('player_id, seat_position, current_points')
            .eq('room_id', roomId)

        if (fetchVacatedError) console.error('Error fetching vacated seats for zimo processing:', fetchVacatedError)

        if (baoPlayerId) {
            // Bao: One player pays all
            await updatePoints(baoPlayerId, -winnerPoints)
        } else {
            // Standard Zimo: Use historical seat map if possible, but for current game
            // we pay based on the seats. We need to identify who is in seats 1-4.
            const allSeats = [1, 2, 3, 4]
            // Get winner's seat
            const winnerSeat = roomPlayers.find(p => p.player_id === winnerId)?.seat_position

            const loserUpdates = []
            for (const seat of allSeats) {
                if (seat === winnerSeat) continue

                // Pay share
                const share = halfPoints

                // Check active room_players
                const activeP = roomPlayers.find(p => p.seat_position === seat)
                if (activeP) {
                    loserUpdates.push(updatePoints(activeP.player_id, -share))
                } else {
                    // Check vacated
                    const vacatedP = currentVacated?.find(v => v.seat_position === seat)
                    if (vacatedP) {
                        loserUpdates.push(updatePoints(vacatedP.player_id, -share))
                    } else {
                        console.error(`No player found in seat ${seat} for zimo payment`)
                    }
                }
            }
            if (loserUpdates.length > 0) {
                await Promise.all(loserUpdates)
            }
        }

        // Merge active + vacated players for complete stats update
        const allPlayers = [
            ...roomPlayers,
            ...(currentVacated || []).map(vs => ({
                player_id: vs.player_id,
                seat_position: vs.seat_position,
                current_points: vs.current_points
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
            // For zimo: each loser pays halfPoints (basePoints/2)
            // For bao: the bao loser pays the full winnerPoints
            loserPoints: baoPlayerId ? winnerPoints : halfPoints,
            handPatterns
        })

        return { round, winnerPoints }
    } catch (err) {
        console.error('Failed to record zimo win:', err)
        throw err
    }
}

// Delete a round and reverse all points and stats - SINGLE SOURCE OF TRUTH
// Optimized: Uses Promise.all for parallel operations
export const deleteRound = async (round, roomId, roomPlayers, vacatedSeats = []) => {
    const { points, win_type, winner_id, loser_id, fan_count, hand_patterns } = round
    const isZimo = win_type === 'zimo' || win_type === 'zimo_bao'
    const actualWinnerPoints = isZimo ? (points / 2) * 3 : points
    const halfPoints = points / 2

    // Merge active + vacated for complete player list
    const allPlayers = [
        ...roomPlayers,
        ...(vacatedSeats || []).map(vs => ({
            player_id: vs.player_id,
            seat_position: vs.seat_position,
            current_points: vs.current_points
        }))
    ]

    // 1. Reverse current_points
    // We fetch latest points from DB to ensure accuracy even if UI is stale
    const updatePointReversal = async (playerId, change) => {
        if (!playerId) return

        // Try active players first
        const { data: activeP, error: activeError } = await supabase
            .from('room_players')
            .select('current_points')
            .eq('room_id', roomId)
            .eq('player_id', playerId)
            .single()

        if (activeP) {
            const { error } = await supabase
                .from('room_players')
                .update({ current_points: (activeP.current_points || 0) + change })
                .eq('room_id', roomId)
                .eq('player_id', playerId)
            if (error) console.error(`Error reversing points for active player ${playerId}:`, error)
        } else {
            // Try vacated seats
            const { data: vacatedP, error: vacatedError } = await supabase
                .from('vacated_seats')
                .select('current_points')
                .eq('room_id', roomId)
                .eq('player_id', playerId)
                .single()

            if (vacatedP) {
                const { error } = await supabase
                    .from('vacated_seats')
                    .update({ current_points: (vacatedP.current_points || 0) + change })
                    .eq('room_id', roomId)
                    .eq('player_id', playerId)
                if (error) console.error(`Error reversing points for vacated player ${playerId}:`, error)
            } else {
                console.error(`Player ${playerId} not found in room roster for point reversal`)
            }
        }
    }

    const pointUpdatePromises = []

    if (win_type === 'eat') {
        pointUpdatePromises.push(updatePointReversal(winner_id, -points))
        if (loser_id) pointUpdatePromises.push(updatePointReversal(loser_id, points))
    } else if (isZimo) {
        pointUpdatePromises.push(updatePointReversal(winner_id, -actualWinnerPoints))
        if (win_type === 'zimo_bao' && loser_id) {
            pointUpdatePromises.push(updatePointReversal(loser_id, actualWinnerPoints))
        } else {
            // Standard Zimo: Reverse points for the 3 players in the other seats
            const allSeats = [1, 2, 3, 4]
            const winnerSeat = allPlayers.find(p => p.player_id === winner_id)?.seat_position

            allSeats.forEach(seat => {
                if (seat === winnerSeat) return
                const p = allPlayers.find(pl => pl.seat_position === seat)
                if (p) {
                    pointUpdatePromises.push(updatePointReversal(p.player_id, halfPoints))
                }
            })
        }
    }

    // Execute all point updates in parallel
    try {
        if (pointUpdatePromises.length > 0) {
            await Promise.all(pointUpdatePromises)
        }
    } catch (err) {
        console.error('Error reversing points in deleteRound:', err)
        throw new Error(`Failed to reverse points: ${err.message}`)
    }


    // 2. Reverse player_stats - fetch all in parallel
    // FILTER OUT SPECTATORS to avoid affecting their stats (e.g. total_rounds_played)
    const validPlayers = allPlayers.filter(p => p.player_id && !p.is_spectator)
    const statsResults = await Promise.all(
        validPlayers.map(player =>
            supabase
                .from('player_stats')
                .select('*')
                .eq('player_id', player.player_id)
                .single()
        )
    )

    // Build stats update operations
    const statsUpdates = []

    validPlayers.forEach((player, index) => {
        const pid = player.player_id
        const { data: stats, error: fetchError } = statsResults[index]

        if (fetchError || !stats) {
            console.error(`Error fetching stats for player ${pid} in deleteRound:`, fetchError)
            return
        }

        const updates = {
            total_games: Math.max(0, (stats.total_games || 0) - 1),
            total_rounds_played: Math.max(0, (stats.total_rounds_played || 0) - 1)
        }



        if (pid === winner_id) {
            updates.total_wins = Math.max(0, (stats.total_wins || 0) - 1)
            updates.total_points_won = Math.max(0, (stats.total_points_won || 0) - actualWinnerPoints)
            updates.total_fan_value = Math.max(0, (stats.total_fan_value || 0) - fan_count)

            if (isZimo) {
                updates.total_zimo = Math.max(0, (stats.total_zimo || 0) - 1)
            } else {
                updates.total_eat = Math.max(0, (stats.total_eat || 0) - 1)
            }

            if (fan_count >= 10) {
                updates.total_limit_hands = Math.max(0, (stats.total_limit_hands || 0) - 1)
            }

            if (hand_patterns && hand_patterns.length > 0) {
                const patternCounts = { ...(stats.hand_pattern_counts || {}) }
                hand_patterns.forEach(patternId => {
                    patternCounts[patternId] = Math.max(0, (patternCounts[patternId] || 0) - 1)
                    if (patternCounts[patternId] === 0) {
                        delete patternCounts[patternId]
                    }
                })
                updates.hand_pattern_counts = patternCounts
            }
        } else if (win_type === 'eat' && pid === loser_id) {
            updates.total_deal_ins = Math.max(0, (stats.total_deal_ins || 0) - 1)
            updates.total_points_lost = Math.max(0, (stats.total_points_lost || 0) - points)
        } else if (win_type === 'zimo_bao' && pid === loser_id) {
            updates.total_bao = Math.max(0, (stats.total_bao || 0) - 1)
            const baoLoss = (points / 2) * 3
            updates.total_points_lost = Math.max(0, (stats.total_points_lost || 0) - baoLoss)
        } else if (win_type === 'zimo' && pid !== winner_id) {
            const share = points / 2
            updates.total_points_lost = Math.max(0, (stats.total_points_lost || 0) - share)
        }

        statsUpdates.push(
            supabase
                .from('player_stats')
                .update(updates)
                .eq('player_id', pid)
                .then(({ error }) => {
                    if (error) console.error(`Error reversing stats for player ${pid}:`, error)
                    return { pid, error }
                })
        )
    })

    // Execute all stats updates in parallel
    try {
        if (statsUpdates.length > 0) {
            await Promise.all(statsUpdates)
        }
    } catch (err) {
        console.error('Critical error reversing stats in deleteRound:', err)
        // We log but don't throw to avoid failing the round deletion if just stats reversal fails
    }

    // 3. Finally delete the round record
    const { error: deleteError } = await supabase
        .from('game_rounds')
        .delete()
        .eq('room_id', roomId)
        .eq('id', round.id)

    if (deleteError) {
        console.error('Error deleting round record:', deleteError)
        throw deleteError
    }

    return true
}
