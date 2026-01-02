import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calculateScoreTotals } from '../lib/scoring'
import {
    getRoomByCode,
    subscribeToRoom,
    unsubscribeFromRoom
} from '../lib/rooms'

const GameRoomContext = createContext({})

export const useGameRoom = () => {
    const context = useContext(GameRoomContext)
    if (!context) {
        throw new Error('useGameRoom must be used within a GameRoomProvider')
    }
    return context
}

export const GameRoomProvider = ({ roomCode, children }) => {
    const [room, setRoom] = useState(null)
    const [rounds, setRounds] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [vacatedSeats, setVacatedSeats] = useState([])

    // Derived state: players and spectators
    const allRoomPlayers = room?.room_players || []
    const players = useMemo(() =>
        allRoomPlayers.filter(rp => !rp.is_spectator),
        [allRoomPlayers]
    )
    const spectators = useMemo(() =>
        allRoomPlayers.filter(rp => rp.is_spectator),
        [allRoomPlayers]
    )

    // Calculate master seat map: player_id -> seat_position
    // Includes active players, vacated players, and final scores
    const masterSeatMap = useMemo(() => {
        const map = {}

        // 1. Start with final scores if completed
        if (room?.final_scores) {
            Object.values(room.final_scores).forEach(s => {
                if (s.player_id) map[s.player_id] = s.seat_position || parseInt(s.seat?.replace('seat', ''))
            })
        }

        // 2. Add vacated seats
        vacatedSeats.forEach(vs => {
            if (vs.player_id) map[vs.player_id] = vs.seat_position
        })

        // 3. Add active players (overrides if discrepancies exist)
        allRoomPlayers.forEach(rp => {
            if (rp.player_id && rp.seat_position) {
                map[rp.player_id] = rp.seat_position
            }
        })

        return map
    }, [room, vacatedSeats, allRoomPlayers])

    // Calculate score totals from rounds (single source of truth)
    const scoreTotals = useMemo(() => {
        return calculateScoreTotals(rounds, masterSeatMap)
    }, [rounds, masterSeatMap])

    // Fetch rounds
    const fetchRounds = useCallback(async (roomId) => {
        const { data } = await supabase
            .from('game_rounds')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
        setRounds(data || [])
    }, [])

    // Fetch vacated seats
    const fetchVacated = useCallback(async (roomId) => {
        const { data } = await supabase
            .from('vacated_seats')
            .select('*')
            .eq('room_id', roomId)
        setVacatedSeats(data || [])
    }, [])

    // Fetch room data
    const fetchRoom = useCallback(async () => {
        try {
            const roomData = await getRoomByCode(roomCode)
            setRoom(roomData)
            setLoading(false)
            return roomData
        } catch (err) {
            setError(err.message)
            setLoading(false)
            return null
        }
    }, [roomCode])

    // Refresh room and rounds (after recording a win, etc.)
    const refreshData = useCallback(async () => {
        const roomData = await fetchRoom()
        if (roomData) {
            await Promise.all([
                fetchRounds(roomData.id),
                fetchVacated(roomData.id)
            ])
        }
    }, [fetchRoom, fetchRounds, fetchVacated])

    // Refresh when page becomes visible (handles mobile lock screen wake)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Page visible, refreshing room data...')
                refreshData()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [refreshData])

    useEffect(() => {
        let channel = null
        let roundsChannel = null

        const init = async () => {
            const roomData = await fetchRoom()
            if (!roomData) return

            // Fetch initial data
            await Promise.all([
                fetchRounds(roomData.id),
                fetchVacated(roomData.id)
            ])

            // Subscribe to all room-related changes (players, rooms, rounds, vacated)
            // One channel for everything avoids binding mismatches
            channel = subscribeToRoom(roomData.id, async () => {
                console.log('Room data changed, refreshing...')
                refreshData()
            })
        }

        init()

        return () => {
            if (channel) {
                unsubscribeFromRoom(channel)
            }
        }
    }, [roomCode, fetchRoom, fetchRounds])

    const value = {
        // State
        room,
        rounds,
        players,
        spectators,
        vacatedSeats,
        masterSeatMap,
        scoreTotals,
        loading,
        error,
        // Actions
        refreshData,
        setRoom,
        setError
    }

    return (
        <GameRoomContext.Provider value={value}>
            {children}
        </GameRoomContext.Provider>
    )
}
