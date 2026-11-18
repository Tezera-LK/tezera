// Lives in this folder, not at the (portal) level: a loading.tsx wraps the page next to it but not the
// layouts above, so the sign-in check in (portal)/layout.tsx finishes first and can redirect for real (307).
export { default } from "@/components/states/LoadingState";
