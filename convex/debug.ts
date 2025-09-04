import { query } from "./_generated/server";

export const debugUserData = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .collect();

    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasLocation: !!user.location,
      locationData: user.location,
      hasOneSignalId: !!user.oneSignalPlayerId,
      oneSignalPlayerId: user.oneSignalPlayerId ? 
        user.oneSignalPlayerId.substring(0, 10) + '...' : 
        'Not set',
      pushNotificationsEnabled: user.pushNotificationsEnabled,
    }));
  },
});
