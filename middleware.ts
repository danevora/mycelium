import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// API routes self-guard and return JSON 401 (see route handlers). Page routes
// redirect signed-out users to Clerk sign-in.
const isApiRoute = createRouteMatcher(["/api(.*)"]);
// Public, no-auth pages: the marketing landing at "/" (signed-in users are
// redirected to their wiki inside the page), and the opt-in shared graph
// (resolved only by an unguessable token, never by wiki id — see app/share/[token]/graph).
const isPublicRoute = createRouteMatcher(["/", "/share(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isApiRoute(req) && !isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless referenced in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
