import { initAuth0 } from "@auth0/nextjs-auth0"

// Initialize Auth0 client
export const auth0 = initAuth0()

// Re-export commonly used Auth0 functions
export { getSession, getAccessToken, withApiAuthRequired, withPageAuthRequired } from "@auth0/nextjs-auth0"
