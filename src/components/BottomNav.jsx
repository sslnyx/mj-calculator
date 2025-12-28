import { Home, Trophy, User, Clock } from 'lucide-react'

const BottomNav = ({ currentPage, onNavigate }) => {
    const navItems = [
        { id: 'home', label: '大廳', icon: Home },
        { id: 'rankings', label: '排行', icon: Trophy },
        { id: 'profile', label: '我的', icon: User },
        { id: 'history', label: '歷史', icon: Clock }
    ]

    return (
        <nav className="bottom-nav">
            {navItems.map(item => (
                <button
                    key={item.id}
                    className={`bottom-nav-item ${currentPage === item.id ? 'active' : ''}`}
                    onClick={() => onNavigate(item.id)}
                >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>
    )
}

export default BottomNav
