// Helper to get first name only from full name
export const getFirstName = (fullName) => {
    if (!fullName) return ''
    return fullName.split(' ')[0]
}
