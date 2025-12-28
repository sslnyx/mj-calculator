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
            <div className="login-page">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="login-page">
            {/* Video Background */}
            <video
                className="login-video-bg"
                autoPlay
                loop
                muted
                playsInline
            >
                <source src={bgVideo} type="video/mp4" />
            </video>

            {/* Start Button */}
            <button className="start-btn" onClick={handleGoogleLogin}>
                START
            </button>
        </div>
    )
}

export default Login
