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

    // Calculate score totals from rounds (single source of truth)
    const scoreTotals = useMemo(() => {
        return calculateScoreTotals(rounds, players)
    }, [rounds, players])

    // Fetch rounds
    const fetchRounds = useCallback(async (roomId) => {
        const { data } = await supabase
            .from('game_rounds')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
        setRounds(data || [])
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
            await fetchRounds(roomData.id)
        }
    }, [fetchRoom, fetchRounds])

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

            // Fetch initial rounds
            await fetchRounds(roomData.id)

            // Subscribe to room changes
            channel = subscribeToRoom(roomData.id, async () => {
                const updated = await getRoomByCode(roomCode)
                setRoom(updated)
            })

            // Subscribe to rounds changes
            roundsChannel = supabase
                .channel(`gameroom_rounds_${roomData.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'game_rounds',
                    filter: `room_id=eq.${roomData.id}`
                }, () => {
                    fetchRounds(roomData.id)
                })
                .subscribe()
        }

        init()

        return () => {
            if (channel) {
                unsubscribeFromRoom(channel)
            }
            if (roundsChannel) {
                supabase.removeChannel(roundsChannel)
            }
        }
    }, [roomCode, fetchRoom, fetchRounds])

    const value = {
        // State
        room,
        rounds,
        players,
        spectators,
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
