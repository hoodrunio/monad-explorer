/**
 * Composable for authentication functionality
 * Handles login, logout, and auth state for mainnet access
 */
export const useAuth = () => {
	const router = useRouter()
	const isLoggingIn = ref(false)
	const loginError = ref(null)

	/**
	 * Login with password
	 * @param {string} password - Password to authenticate with
	 * @returns {Promise<boolean>} Success status
	 */
	const login = async (password) => {
		isLoggingIn.value = true
		loginError.value = null

		try {
			const response = await $fetch('/api/auth/login', {
				method: 'POST',
				body: {
					password
				}
			})

			if (response.success) {
				// Redirect to home page after successful login
				router.push('/')
				return true
			}

			return false
		} catch (error) {
			console.error('Login error:', error)

			// Extract error message
			if (error.statusCode === 401) {
				loginError.value = 'Invalid password. Please try again.'
			} else if (error.statusCode === 400) {
				loginError.value = 'Password is required.'
			} else {
				loginError.value = 'An error occurred. Please try again.'
			}

			return false
		} finally {
			isLoggingIn.value = false
		}
	}

	/**
	 * Logout and clear session
	 * @returns {Promise<void>}
	 */
	const logout = async () => {
		try {
			await $fetch('/api/auth/logout', {
				method: 'POST'
			})

			// Redirect to login page
			router.push('/auth/login')
		} catch (error) {
			console.error('Logout error:', error)
			// Even if API fails, redirect to login
			router.push('/auth/login')
		}
	}

	return {
		login,
		logout,
		isLoggingIn,
		loginError
	}
}
