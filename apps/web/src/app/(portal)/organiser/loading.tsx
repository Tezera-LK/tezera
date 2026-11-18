// Lives in this folder, not at the (portal) level: a loading.tsx wraps its folder's page but not its
// layout, so the role check in layout.tsx finishes first and a wrong role gets a real redirect (307).
export { default } from "@/components/states/LoadingState";
