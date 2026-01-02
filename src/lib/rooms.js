import { supabase } from './supabase'
import { addGuestOwnership } from './guests'

// 超級無敵搭錯線 room name generator (TVB 獎門人 style)
// Mix A phrases with B phrases for funny combinations

const PHRASES_A = [
    '同銀行職員講',
    '同老婆講',
    '同老闆講',
    '同警察講',
    '同醫生講',
    '同阿媽講',
    '喺巴士度講',
    '喺電梯度講',
    '喺廁所度講',
    '半夜三更講',
    '食雞之前講',
    '打牌輸咗講',
    '贏咗錢講',
    '放銃之後講',
    '自摸之後講',
    '同隔離講',
    '大聲公講',
    '面試嗰陣講',
    '結婚典禮講',
    '開會嗰陣講',
    '同老公講',
    '同女朋友講',
    '同男朋友講',
    '同鬼佬講',
    '同阿爸講',
    '同阿婆講',
    '同細路講',
    '喺地鐵講',
    '喺飛機講',
    '喺戲院講',
    '喺教堂講',
    '喺醫院講',
    '喺學校講',
    '喺殯儀館講',
    '喺法庭講',
    '飲醉酒講',
    '瞓醒覺講',
    '食完飯講',
    '拍緊拖講',
    '同明星講',
    '同乞兒講',
    '同師奶講',
    '同司機講',
    '臨死之前講',
    '發完脾氣講',
    '碰完牌講',
    '摸完牌講',
    '收工之後講',
    '返工之前講',
    '領獎嗰陣講',
    // More situations
    '同前度講',
    '同情敵講',
    '同債主講',
    '同房東講',
    '同保安講',
    '同外賣仔講',
    '同快遞員講',
    '同美容師講',
    '同髮型師講',
    '同按摩師講',
    '喺游泳池講',
    '喺健身房講',
    '喺酒吧講',
    '喺夜總會講',
    '喺超市講',
    '喺街市講',
    '喺茶餐廳講',
    '喺麥當勞講',
    '喺賭場講',
    '喺銀行講',
    '喺ATM機講',
    '喺紅綠燈講',
    '食緊火鍋講',
    '唱緊K講',
    '做緊運動講',
    '瞓緊覺講',
    '沖緊涼講',
    '食緊蛇羹講',
    '執緊麻將講',
    '洗緊牌講'
]

const PHRASES_B = [
    '你唔好扮曬蟹',
    '我好餓呀',
    '畀條路嚟行',
    '點解咁臭',
    '我要食嘢',
    '快啲啦喂',
    '做乜咁串',
    '邊個放屁',
    '錢唔夠使',
    '我唔得閒',
    '你識條鐵',
    '有冇搞錯',
    '食咩咁勁',
    '頂你個肺',
    '仆你個街',
    '你好靚仔',
    '今晚食乜',
    '我要瞓覺',
    '買單唔該',
    '自摸三番',
    '食糊啦喂',
    '包牌啦你',
    '再嚟一局',
    '運氣爆棚',
    '發財大利',
    '我好攰呀',
    '你講乜話',
    '聽唔明呀',
    '好鬼煩呀',
    '唔關我事',
    '你有病呀',
    '咁都得呀',
    '搞咩鬼呀',
    '唔好意思',
    '我要加薪',
    '你好肥呀',
    '你好瘦呀',
    '咁都唔識',
    '我唔鍾意',
    '好似唔係',
    '唔好阻住',
    '食屎啦你',
    '收皮啦你',
    '走啦走啦',
    '唔該借過',
    '借少少錢',
    '你老味呀',
    '你癲咗呀',
    '好鬼難頂',
    '我要放假',
    // More responses
    '你條友仔',
    '唔好嘈住',
    '你好煩呀',
    '我要返屋企',
    '邊度有得食',
    '幾點收工',
    '你邊位呀',
    '識唔識架',
    '你搵我呀',
    '等我先啦',
    '睇乜嘢呀',
    '唔好咁啦',
    '我要出糧',
    '我想辭職',
    '做乜唔講',
    '你估我唔識',
    '你好無聊',
    '點解你喺度',
    '邊個叫你嚟',
    '你食咗飯未',
    '你沖咗涼未',
    '發達未呀',
    '準備落注',
    '我要碰牌',
    '食胡喇喂',
    '等緊你呀',
    '有冇高牌',
    '打清一色',
    '十三幺呀',
    '大三元啊'
]

// Generate a 搭錯線 style room name
const generateRoomName = () => {
    const a = PHRASES_A[Math.floor(Math.random() * PHRASES_A.length)]
    const b = PHRASES_B[Math.floor(Math.random() * PHRASES_B.length)]
    return `${a}${b}`
}

// Create a new game room
export const createRoom = async (hostId) => {
    const roomCode = generateRoomName()

    const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
            room_code: roomCode,
            host_id: hostId,
            status: 'waiting'
        })
        .select()
        .single()

    if (roomError) throw roomError

    // Host automatically joins the room at seat 1
    const { error: joinError } = await supabase
        .from('room_players')
        .insert({
            room_id: room.id,
            player_id: hostId,
            seat_position: 1,
            current_points: 0
        })

    if (joinError) throw joinError

    return room
}

// Get room by code
export const getRoomByCode = async (roomCode) => {
    const { data, error } = await supabase
        .from('game_rooms')
        .select(`
      *,
      room_players (
        *,
        player:players (id, display_name, avatar_url, avatar_seed)
      )
    `)
        .eq('room_code', roomCode.toUpperCase())
        .single()

    if (error) throw error
    return data
}

// Join an existing room
export const joinRoom = async (roomCode, playerId) => {
    // First get the room
    const room = await getRoomByCode(roomCode)

    if (!room) {
        throw new Error('Room not found')
    }

    // Check if player is already in the room - allow reconnecting
    const existingPlayer = room.room_players.find(rp => rp.player_id === playerId)
    if (existingPlayer) {
        // Already in room, just return it (allows rejoin)
        return room
    }

    // Can't join completed games
    if (room.status === 'completed') {
        throw new Error('Game has ended')
    }

    // Count non-spectator players
    const players = room.room_players.filter(rp => !rp.is_spectator)

    // Check if room has space for players
    if (players.length >= 4) {
        throw new Error('Room is full - use Spectate option to watch')
    }

    // For active games, check for vacated seats (seats that were left but have points)
    if (room.status === 'active') {
        // Find seats that are unoccupied (1-4)
        const occupiedSeats = players.map(rp => rp.seat_position)
        let emptySeat = null
        for (let seat = 1; seat <= 4; seat++) {
            if (!occupiedSeats.includes(seat)) {
                emptySeat = seat
                break
            }
        }

        if (!emptySeat) {
            throw new Error('No available seats')
        }

        // Check if there's a vacated seat record with points for this seat
        const { data: vacatedSeat } = await supabase
            .from('vacated_seats')
            .select('*')
            .eq('room_id', room.id)
            .eq('seat_position', emptySeat)
            .single()

        const inheritedPoints = vacatedSeat?.current_points || 0

        // If there was a vacated seat, delete it
        if (vacatedSeat) {
            await supabase
                .from('vacated_seats')
                .delete()
                .eq('id', vacatedSeat.id)
        }

        // Join with inherited points
        const { error } = await supabase
            .from('room_players')
            .insert({
                room_id: room.id,
                player_id: playerId,
                seat_position: emptySeat,
                current_points: inheritedPoints,
                is_spectator: false
            })

        if (error) throw error
        return await getRoomByCode(roomCode)
    }

    // For waiting rooms, find next available seat with 0 points
    const occupiedSeats = players.map(rp => rp.seat_position)
    let nextSeat = 1
    while (occupiedSeats.includes(nextSeat) && nextSeat <= 4) {
        nextSeat++
    }

    // Join the room
    const { error } = await supabase
        .from('room_players')
        .insert({
            room_id: room.id,
            player_id: playerId,
            seat_position: nextSeat,
            current_points: 0,
            is_spectator: false
        })

    if (error) throw error

    // Auto-adopt any guests in the room
    await adoptGuestsInRoom(room.id, playerId)

    // Return updated room
    return await getRoomByCode(roomCode)
}

// Helper: Adopt all guests in a room (add ownership)
const adoptGuestsInRoom = async (roomId, newOwnerId) => {
    try {
        // Get all players in the room who are guests
        const { data: roomPlayers } = await supabase
            .from('room_players')
            .select(`
                player:players (
                    id,
                    is_guest
                )
            `)
            .eq('room_id', roomId)

        if (!roomPlayers) return

        // For each guest, add ownership
        for (const rp of roomPlayers) {
            if (rp.player?.is_guest) {
                try {
                    await addGuestOwnership(rp.player.id, newOwnerId)
                } catch (err) {
                    // Ignore errors (might already own this guest)
                    console.log('Auto-adopt skipped:', err.message)
                }
            }
        }
    } catch (err) {
        console.error('Error adopting guests:', err)
    }
}

// Join as spectator (watch only mode)
export const joinAsSpectator = async (roomCode, playerId) => {
    const room = await getRoomByCode(roomCode)

    if (!room) {
        throw new Error('Room not found')
    }

    // Check if player is already in the room
    const existingPlayer = room.room_players.find(rp => rp.player_id === playerId)
    if (existingPlayer) {
        return room
    }

    // Can't spectate completed games
    if (room.status === 'completed') {
        throw new Error('Game has ended')
    }

    // Join as spectator (no seat position)
    const { error } = await supabase
        .from('room_players')
        .insert({
            room_id: room.id,
            player_id: playerId,
            seat_position: null,
            current_points: 0,
            is_spectator: true
        })

    if (error) throw error

    return await getRoomByCode(roomCode)
}

// Leave a room
export const leaveRoom = async (roomId, playerId) => {
    // First, get the player's current seat, points, and name
    const { data: playerData } = await supabase
        .from('room_players')
        .select(`
            seat_position, 
            current_points,
            player:players (id, display_name)
        `)
        .eq('room_id', roomId)
        .eq('player_id', playerId)
        .single()

    // Check if the game is active
    const { data: roomData } = await supabase
        .from('game_rooms')
        .select('status')
        .eq('id', roomId)
        .single()

    // If game is active and player has a seat, save to vacated_seats with player info
    if (roomData?.status === 'active' && playerData?.seat_position) {
        await supabase
            .from('vacated_seats')
            .upsert({
                room_id: roomId,
                seat_position: playerData.seat_position,
                current_points: playerData.current_points || 0,
                player_id: playerId,
                player_name: playerData.player?.display_name || 'Unknown Player'
            }, {
                onConflict: 'room_id,seat_position'
            })
    }

    // Delete the room_players record
    const { error } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('player_id', playerId)

    if (error) throw error
}

// Start the game (host only)
export const startGame = async (roomId, hostId) => {
    // Verify host
    const { data: room } = await supabase
        .from('game_rooms')
        .select('host_id, room_players(id)')
        .eq('id', roomId)
        .single()

    if (room.host_id !== hostId) {
        throw new Error('Only the host can start the game')
    }

    if (room.room_players.length < 2) {
        throw new Error('Need at least 2 players to start')
    }

    const { data, error } = await supabase
        .from('game_rooms')
        .update({
            status: 'active',
            started_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .select()
        .single()

    if (error) throw error
    return data
}

// End the game
export const endGame = async (roomId) => {
    // First, get current scores from room_players before ending
    const { data: roomPlayers } = await supabase
        .from('room_players')
        .select(`
            seat_position,
            current_points,
            is_spectator,
            player:players (id, display_name)
        `)
        .eq('room_id', roomId)
        .eq('is_spectator', false)
        .order('seat_position')

    // Build final_scores object by seat
    const finalScores = {}
    const occupiedSeats = new Set()

    if (roomPlayers) {
        roomPlayers.forEach(rp => {
            if (rp.seat_position) {
                occupiedSeats.add(rp.seat_position)
                finalScores[`seat${rp.seat_position}`] = {
                    player_id: rp.player?.id,
                    player_name: rp.player?.display_name,
                    points: rp.current_points || 0
                }
            }
        })
    }

    // Also fetch vacated seats (players who left) for seats not currently occupied
    const { data: vacatedSeats } = await supabase
        .from('vacated_seats')
        .select('seat_position, current_points, player_id, player_name')
        .eq('room_id', roomId)

    if (vacatedSeats) {
        vacatedSeats.forEach(vs => {
            // Only add if this seat is not currently occupied by another player
            if (vs.seat_position && !occupiedSeats.has(vs.seat_position)) {
                finalScores[`seat${vs.seat_position}`] = {
                    player_id: vs.player_id,
                    player_name: vs.player_name || 'Unknown Player',
                    points: vs.current_points || 0
                }
            }
        })
    }

    // Update game room with final scores and completed status
    const { data, error } = await supabase
        .from('game_rooms')
        .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            final_scores: finalScores
        })
        .eq('id', roomId)
        .select()
        .single()

    if (error) throw error
    return data
}

// Subscribe to room changes (real-time)
export const subscribeToRoom = (roomId, callback) => {
    const channel = supabase
        .channel(`room:${roomId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'room_players',
                filter: `room_id=eq.${roomId}`
            },
            callback
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'game_rooms',
                filter: `id=eq.${roomId}`
            },
            callback
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'game_rounds',
                filter: `room_id=eq.${roomId}`
            },
            callback
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'vacated_seats',
                filter: `room_id=eq.${roomId}`
            },
            callback
        )
        .subscribe((status, err) => {
            if (err) {
                console.error('[Realtime] Subscription error:', err)
            }
        })

    return channel
}

// Unsubscribe from room
export const unsubscribeFromRoom = (channel) => {
    supabase.removeChannel(channel)
}
