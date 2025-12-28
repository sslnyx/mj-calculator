import { Home, Trophy, User, Clock } from 'lucide-react'

const BottomNav = ({ currentPage, onNavigate }) => {
    const navItems = [
        { id: 'home', label: '大廳', icon: Home },
        { id: 'rankings', label: '排行', icon: Trophy },
        { id: 'profile', label: '我的', icon: User },
        { id: 'history', label: '歷史', icon: Clock }
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t-[3px] border-black flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
            {navItems.map(item => (
                <button
                    key={item.id}
                    className={`flex flex-col items-center justify-center gap-0.5 py-2 px-4 bg-transparent border-none cursor-pointer transition-all duration-150 ${currentPage === item.id
                            ? 'text-orange scale-110'
                            : 'text-gray-500 hover:text-black'
                        }`}
                    onClick={() => onNavigate(item.id)}
                >
                    <item.icon size={20} />
                    <span className="text-xs font-bold font-body">{item.label}</span>
                </button>
            ))}
        </nav>
    )
}

export default BottomNav
