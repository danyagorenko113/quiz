// Re-export commonly used Auth0 functions
// Note: In v4.14.0, these may need to be imported directly in each file
// due to Turbopack resolution issues with Next.js 16
export { getSession, getAccessToken, withApiAuthRequired, withPageAuthRequired } from "@auth0/nextjs-auth0"
