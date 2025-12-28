import { auth0 } from "@/lib/auth0"

const handler = auth0.handleAuth()

export { handler as GET, handler as POST }
