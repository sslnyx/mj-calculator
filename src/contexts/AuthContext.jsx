import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [player, setPlayer] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        // Initialize auth state - instant from cache
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (mounted) {
                    setUser(session?.user ?? null)
                    setLoading(false) // Immediately show UI based on session
                }

                // Fetch player data in background (non-blocking)
                if (session?.user) {
                    fetchOrCreatePlayer(session.user).then(playerData => {
                        if (mounted) setPlayer(playerData)
                    })
                }
            } catch (err) {
                console.error('Auth init error:', err)
                if (mounted) setLoading(false)
            }
        }

        initAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event)

                if (!mounted) return

                setUser(session?.user ?? null)
                setLoading(false)

                if (session?.user) {
                    fetchOrCreatePlayer(session.user).then(playerData => {
                        if (mounted) setPlayer(playerData)
                    })
                } else {
                    setPlayer(null)
                }
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    // Fetch or create player record
    const fetchOrCreatePlayer = async (authUser) => {
        try {
            // First try to fetch existing player
            const { data: existingPlayer, error: fetchError } = await supabase
                .from('players')
                .select('*')
                .eq('id', authUser.id)
                .single()

            if (existingPlayer) {
                return existingPlayer
            }

            // Player doesn't exist (PGRST116 error is expected), create new one
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Fetch player error:', fetchError)
            }

            // Create new player
            const { data: newPlayer, error: insertError } = await supabase
                .from('players')
                .insert({
                    id: authUser.id,
                    email: authUser.email,
                    display_name: authUser.user_metadata?.full_name ||
                        authUser.user_metadata?.name ||
                        authUser.email?.split('@')[0] ||
                        'Player',
                    avatar_url: authUser.user_metadata?.avatar_url || null
                })
                .select()
                .single()

            if (insertError) {
                // Player might already exist (race condition), try fetch again
                if (insertError.code === '23505') {
                    const { data: retryPlayer } = await supabase
                        .from('players')
                        .select('*')
                        .eq('id', authUser.id)
                        .single()
                    return retryPlayer
                }
                console.error('Insert player error:', insertError)
                return null
            }

            return newPlayer
        } catch (error) {
            console.error('Error fetching/creating player:', error)
            return null
        }
    }

    // Sign in with Google
    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`
            }
        })
        if (error) throw error
    }

    // Sign out
    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setUser(null)
        setPlayer(null)
    }

    // Update player profile
    const updatePlayer = async (updates) => {
        if (!user) return null

        const { data, error } = await supabase
            .from('players')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single()

        if (error) throw error
        setPlayer(data)
        return data
    }

    const value = {
        user,
        player,
        loading,
        signInWithGoogle,
        signOut,
        updatePlayer
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
