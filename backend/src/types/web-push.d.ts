declare module 'web-push' {
  // Keep it loose: we only need `setVapidDetails` and `sendNotification`.
  const webpush: any;
  export default webpush;
}

