import { useAuth } from '../contexts/AuthContext'
import bgVideo from '../assets/Animated_Game_Server_Background_Video.mp4'

const Login = () => {
    const { signInWithGoogle, loading } = useAuth()

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle()
        } catch (error) {
            console.error('Login error:', error)
        }
    }

    if (loading) {
        return (
            <div className="h-[100svh] flex items-center justify-center bg-black">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="h-[100svh] md:h-[100%] flex flex-col items-center justify-end gap-8 p-8 pb-[15%] bg-black relative overflow-hidden">
            {/* Video Background */}
            <video
                className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 z-0 object-cover"
                autoPlay
                loop
                muted
                playsInline
            >
                <source src={bgVideo} type="video/mp4" />
            </video>

            {/* Start Button */}
            <button
                className="font-title text-3xl py-4 px-8 text-black border-comic-thick rounded-lg cursor-pointer z-10 tracking-widest relative overflow-hidden animate-pulse-glow transition-all duration-200 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #FFD600 0%, #FF9E00 100%)' }}
                onClick={handleGoogleLogin}
            >
                {/* Shine effect */}
                <span className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/40 to-transparent rotate-45 animate-shine pointer-events-none"></span>
                <span className="relative z-10">開始</span>
            </button>
        </div>
    )
}

export default Login
