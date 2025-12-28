import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import HexagonChart from '../components/HexagonChart'
import { ArrowLeft } from 'lucide-react'

const ProfilePage = ({ playerId, onBack }) => {
    const [player, setPlayer] = useState(null)
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            if (!playerId) return
            setLoading(true)

            // Fetch player info
            const { data: playerData } = await supabase
                .from('players')
                .select('*')
                .eq('id', playerId)
                .single()

            // Fetch player stats
            const { data: statsData } = await supabase
                .from('player_stats')
                .select('*')
                .eq('player_id', playerId)
                .single()

            setPlayer(playerData)
            setStats(statsData)
            setLoading(false)
        }

        fetchProfile()
    }, [playerId])

    // Calculate Hexagon values (0-100 scale)
    const calculateHexagonData = () => {
        if (!stats) return [0, 0, 0, 0, 0, 0]

        const rounds = stats.total_rounds_played || 1
        const wins = stats.total_wins || 1

        // Speed: Win Rate (35% = 100%)
        const winRate = (stats.total_wins / rounds) * 100
        const speed = Math.min(100, (winRate / 35) * 100)

        // Attack: Avg Fan (8 fan = 100%)
        const avgFan = (stats.total_fan_value || 0) / wins
        const attack = Math.min(100, (avgFan / 8) * 100)

        // Defense: Deal-in Avoidance (0% = 100%, 20% = 0%)
        const dealInRate = ((stats.total_deal_ins || 0) / rounds) * 100
        const defense = Math.max(0, 100 - (dealInRate / 20) * 100)

        // Luck: Zimo Rate (70% = 100%)
        const zimoRate = ((stats.total_zimo || 0) / wins) * 100
        const luck = Math.min(100, (zimoRate / 70) * 100)

        // Magic: Limit Hand Frequency (15% = 100%)
        const limitRate = ((stats.total_limit_hands || 0) / wins) * 100
        const magic = Math.min(100, (limitRate / 15) * 100)

        // Sanity: Bao Avoidance (0% = 100%, 10% = 0%)
        const baoRate = ((stats.total_bao || 0) / rounds) * 100
        const sanity = Math.max(0, 100 - (baoRate / 10) * 100)

        return [speed, attack, defense, luck, magic, sanity]
    }

    if (loading) {
        return (
            <div className="profile-page loading">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    if (!player) {
        return (
            <div className="profile-page error">
                <p>Player not found</p>
                <button className="back-btn" onClick={onBack}>Go Back</button>
            </div>
        )
    }

    const hexData = calculateHexagonData()
    const netPoints = (stats?.total_points_won || 0) - (stats?.total_points_lost || 0)

    return (
        <div className="profile-page">
            {/* Header */}
            <header className="profile-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>
                <h1>我的戰績</h1>
            </header>

            {/* Player Info */}
            <section className="profile-info">
                <div className="player-avatar-large">
                    {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.display_name} />
                    ) : (
                        player.display_name?.charAt(0) || '?'
                    )}
                </div>
                <div className="player-name-row">
                    <h2 className="player-name-large">{player.display_name}</h2>
                    {player.is_admin && <span className="admin-badge">Admin</span>}
                </div>
                <p className="player-email">{player.email}</p>
                <div className={`net-points ${netPoints >= 0 ? 'positive' : 'negative'}`}>
                    {netPoints >= 0 ? '+' : ''}{netPoints} pts
                </div>
            </section>

            {/* Hexagon Chart */}
            <section className="hexagon-section">
                <h3>六邊形戰士</h3>
                <HexagonChart
                    data={hexData}
                    labels={['速度', '攻擊', '防守', '運氣', '魔法', '心態']}
                    size={280}
                />
            </section>

            {/* Stats Grid */}
            <section className="profile-stats">
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-value">{stats?.total_rounds_played || 0}</span>
                        <span className="stat-label">總局數</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats?.total_wins || 0}</span>
                        <span className="stat-label">勝利</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats?.total_zimo || 0}</span>
                        <span className="stat-label">自摸</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats?.highest_fan || 0}</span>
                        <span className="stat-label">最高番</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats?.total_deal_ins || 0}</span>
                        <span className="stat-label">放銃</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats?.total_bao || 0}</span>
                        <span className="stat-label">包牌</span>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default ProfilePage
