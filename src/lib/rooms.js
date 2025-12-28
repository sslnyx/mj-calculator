import { supabase } from './supabase'

// Generate a random 6-character room code
const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluding confusing chars like 0/O, 1/I
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

// Create a new game room
export const createRoom = async (hostId) => {
    const roomCode = generateRoomCode()

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
        player:players (id, display_name, avatar_url)
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

    // Check if room has space (anyone can join if there's an empty seat)
    if (room.room_players.length >= 4) {
        throw new Error('Room is full')
    }

    // For active games, check for vacated seats (seats that were left but have points)
    if (room.status === 'active') {
        // Find seats that are unoccupied (1-4)
        const occupiedSeats = room.room_players.map(rp => rp.seat_position)
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
                current_points: inheritedPoints
            })

        if (error) throw error
        return await getRoomByCode(roomCode)
    }

    // For waiting rooms, find next available seat with 0 points
    const occupiedSeats = room.room_players.map(rp => rp.seat_position)
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
            current_points: 0
        })

    if (error) throw error

    // Return updated room
    return await getRoomByCode(roomCode)
}

// Leave a room
export const leaveRoom = async (roomId, playerId) => {
    // First, get the player's current seat and points
    const { data: playerData } = await supabase
        .from('room_players')
        .select('seat_position, current_points')
        .eq('room_id', roomId)
        .eq('player_id', playerId)
        .single()

    // Check if the game is active
    const { data: roomData } = await supabase
        .from('game_rooms')
        .select('status')
        .eq('id', roomId)
        .single()

    // If game is active and player has points, save to vacated_seats
    if (roomData?.status === 'active' && playerData) {
        await supabase
            .from('vacated_seats')
            .upsert({
                room_id: roomId,
                seat_position: playerData.seat_position,
                current_points: playerData.current_points
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
    const { data, error } = await supabase
        .from('game_rooms')
        .update({
            status: 'completed',
            ended_at: new Date().toISOString()
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
        .subscribe()

    return channel
}

// Unsubscribe from room
export const unsubscribeFromRoom = (channel) => {
    supabase.removeChannel(channel)
}
