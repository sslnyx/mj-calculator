import { supabase } from './supabase'

/**
 * Create a new guest player
 * @param {string} name - Display name for the guest
 * @param {string} ownerId - UUID of the authenticated user creating the guest
 * @param {string} avatarSeed - Optional avatar seed for DiceBear
 * @returns {Promise<object>} The created guest player
 */
export const createGuest = async (name, ownerId, avatarSeed = null) => {
    // Generate a random avatar seed if not provided
    const seed = avatarSeed || Math.random().toString(36).substring(2, 10)

    // Insert the guest player
    const { data: guest, error: playerError } = await supabase
        .from('players')
        .insert({
            display_name: name,
            is_guest: true,
            avatar_seed: seed
        })
        .select()
        .single()

    if (playerError) throw playerError

    // Create ownership record
    const { error: ownerError } = await supabase
        .from('owner_players')
        .insert({
            owner_id: ownerId,
            player_id: guest.id
        })

    if (ownerError) {
        // Cleanup: delete the guest if ownership fails
        await supabase.from('players').delete().eq('id', guest.id)
        throw ownerError
    }

    return guest
}

/**
 * Get all guests owned by a user
 * @param {string} ownerId - UUID of the authenticated user
 * @returns {Promise<object[]>} Array of guest player objects
 */
export const getGuests = async (ownerId) => {
    // Use explicit relationship hint: owner_players.player_id -> players.id
    const { data, error } = await supabase
        .from('owner_players')
        .select(`
            player_id,
            players!owner_players_player_id_fkey (
                id,
                display_name,
                avatar_url,
                avatar_seed,
                is_guest
            )
        `)
        .eq('owner_id', ownerId)

    if (error) throw error

    // Flatten the response
    return data.map(row => row.players).filter(Boolean)
}

/**
 * Add ownership of a guest to a user (for auto-adoption)
 * @param {string} guestId - UUID of the guest player
 * @param {string} ownerId - UUID of the authenticated user
 */
export const addGuestOwnership = async (guestId, ownerId) => {
    const { error } = await supabase
        .from('owner_players')
        .upsert({
            owner_id: ownerId,
            player_id: guestId
        }, {
            onConflict: 'owner_id,player_id',
            ignoreDuplicates: true
        })

    if (error) throw error
}

/**
 * Update a guest's information
 * @param {string} guestId - UUID of the guest player
 * @param {object} updates - Updates to apply (display_name, avatar_seed)
 * @returns {Promise<object>} The updated guest player
 */
export const updateGuest = async (guestId, updates) => {
    const { data, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', guestId)
        .eq('is_guest', true)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Delete a guest (only if you're the owner)
 * @param {string} guestId - UUID of the guest player
 * @param {string} ownerId - UUID of the authenticated user
 */
export const deleteGuest = async (guestId, ownerId) => {
    // First remove ownership
    const { error: ownerError } = await supabase
        .from('owner_players')
        .delete()
        .eq('owner_id', ownerId)
        .eq('player_id', guestId)

    if (ownerError) throw ownerError

    // Check if any other owners exist
    const { data: otherOwners } = await supabase
        .from('owner_players')
        .select('id')
        .eq('player_id', guestId)
        .limit(1)

    // If no other owners, delete the guest player entirely
    if (!otherOwners || otherOwners.length === 0) {
        await supabase.from('players').delete().eq('id', guestId)
    }
}
