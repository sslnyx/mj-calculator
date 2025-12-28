import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { createRoom, joinRoom as joinTableService } from '../lib/rooms'
import GameRoom from './GameRoom'
import ProfilePage from './ProfilePage'
import RankingsPage from './RankingsPage'
import ConfirmModal from '../components/ConfirmModal'
import BottomNav from '../components/BottomNav'

// Helper to get first name only
const getFirstName = (fullName) => {
    if (!fullName) return ''
    return fullName.split(' ')[0]
}

const Dashboard = () => {
    const { player, signOut, loading } = useAuth()
    const [stats, setStats] = useState(null)
    const [activeTables, setActiveTables] = useState([])
    const [currentTable, setCurrentTable] = useState(null)
    const [currentPage, setCurrentPage] = useState('home') // 'home', 'profile', 'rankings'
    const [error, setError] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null) // tableId to delete

    const isAdmin = player?.is_admin === true
    const deletingRef = useRef(false)

    // Fetch player stats (on load and when returning from game)
    useEffect(() => {
        const fetchStats = async () => {
            if (!player) return

            const { data } = await supabase
                .from('player_stats')
                .select('*')
                .eq('player_id', player.id)
                .single()

            if (data) setStats(data)
        }

        // Only fetch when not at a table (i.e., on dashboard)
        if (!currentTable) {
            fetchStats()
        }
    }, [player, currentTable])

    // Fetch and subscribe to active tables
    useEffect(() => {
        const fetchTables = async () => {
            const { data } = await supabase
                .from('game_rooms')
                .select(`
          *,
          room_players (
            *,
            player:players (id, display_name, avatar_url)
          )
        `)
                .in('status', ['waiting', 'active'])
                .order('created_at', { ascending: false })
                .limit(10)

            if (data) setActiveTables(data)
        }

        fetchTables()

        // Subscribe to table changes
        const channel = supabase
            .channel('public:game_rooms')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'game_rooms' },
                () => fetchTables()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'room_players' },
                () => fetchTables()
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [])

    const handleCreateTable = async () => {
        setError(null)
        setIsCreating(true)
        try {
            const table = await createRoom(player.id)
            setCurrentTable(table.room_code)
        } catch (err) {
            setError(err.message)
        } finally {
            setIsCreating(false)
        }
    }

    const handleJoinTable = async (tableCode) => {
        setError(null)
        try {
            await joinTableService(tableCode, player.id)
            setCurrentTable(tableCode)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDeleteClick = (tableId) => {
        if (!isAdmin) return
        setDeleteConfirm(tableId)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm || deletingRef.current) return

        deletingRef.current = true
        const tableId = deleteConfirm
        setDeleteConfirm(null)

        try {
            // First remove all players
            await supabase
                .from('room_players')
                .delete()
                .eq('room_id', tableId)

            // Then delete/close the table
            await supabase
                .from('game_rooms')
                .update({ status: 'completed', ended_at: new Date().toISOString() })
                .eq('id', tableId)
        } catch (err) {
            setError(err.message)
        } finally {
            deletingRef.current = false
        }
    }

    const handleLeaveTable = () => {
        setCurrentTable(null)
        setError(null)
    }

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    // If at a table, show the table view
    if (currentTable) {
        return <GameRoom roomCode={currentTable} onLeave={handleLeaveTable} />
    }

    // Profile Page
    if (currentPage === 'profile') {
        return (
            <>
                <ProfilePage playerId={player?.id} onBack={() => setCurrentPage('home')} />
                <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
            </>
        )
    }

    // Rankings Page
    if (currentPage === 'rankings') {
        return (
            <>
                <RankingsPage onBack={() => setCurrentPage('home')} />
                <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
            </>
        )
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="user-info">
                    {player?.avatar_url && (
                        <img
                            src={player.avatar_url}
                            alt={player.display_name}
                            className="user-avatar"
                        />
                    )}
                    <div className="user-details">
                        <h2>{getFirstName(player?.display_name)}</h2>
                    </div>
                </div>
                <button className="logout-btn" onClick={signOut}>
                    Sign Out
                </button>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <main className="dashboard-main">
                {/* Create Table Button */}
                <section className="create-table-section">
                    <button
                        className="create-table-btn"
                        onClick={handleCreateTable}
                        disabled={isCreating}
                    >
                        {isCreating ? 'Creating...' : '🀄 Create New Table'}
                    </button>
                </section>

                {/* Active Tables */}
                <section className="active-tables-section">
                    <h3>Active Tables</h3>
                    {activeTables.length === 0 ? (
                        <div className="no-tables">
                            <p>No active tables</p>
                            <p className="hint">Create a new table to start playing!</p>
                        </div>
                    ) : (
                        <div className="tables-list">
                            {activeTables.map(table => (
                                <div key={table.id} className="table-card">
                                    <div className="table-info">
                                        <div className="table-code">{table.room_code}</div>
                                        <div className="table-players">
                                            {table.room_players?.map((rp, i) => (
                                                rp.player?.avatar_url ? (
                                                    <img
                                                        key={i}
                                                        src={rp.player.avatar_url}
                                                        alt=""
                                                        className="player-mini-avatar"
                                                        title={rp.player?.display_name}
                                                    />
                                                ) : (
                                                    <div
                                                        key={i}
                                                        className="player-mini-avatar placeholder"
                                                        title={rp.player?.display_name}
                                                    >
                                                        {rp.player?.display_name?.[0] || '?'}
                                                    </div>
                                                )
                                            ))}
                                            <span className="player-count">
                                                {table.room_players?.length || 0}/4
                                            </span>
                                        </div>
                                        <div className={`table-status ${table.status}`}>
                                            {table.status === 'waiting' ? '⏳ Waiting' : '🎮 Playing'}
                                        </div>
                                    </div>
                                    <div className="table-actions">
                                        <button
                                            className="join-table-btn"
                                            onClick={() => handleJoinTable(table.room_code)}
                                            disabled={
                                                // Disable only if full AND not already a member
                                                table.room_players?.length >= 4 &&
                                                !table.room_players?.some(rp => rp.player_id === player?.id)
                                            }
                                        >
                                            {table.room_players?.some(rp => rp.player_id === player?.id)
                                                ? 'Rejoin'
                                                : 'Join'}
                                        </button>
                                        {isAdmin && (
                                            <button
                                                className="delete-table-btn"
                                                onClick={() => handleDeleteClick(table.id)}
                                                title="Delete table"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirm !== null}
                title="Delete Table"
                message="Are you sure you want to delete this table? All players will be removed."
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteConfirm(null)}
            />

            {/* Fixed Bottom Navigation */}
            <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
        </div>
    )
}

export default Dashboard
