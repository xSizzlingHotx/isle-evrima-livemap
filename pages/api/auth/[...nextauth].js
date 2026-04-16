import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId:     process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) token.discordId = profile.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.discordId) session.user.discordId = token.discordId;
      return session;
    },
  },
  pages: { signIn: '/login' },
};

export default NextAuth(authOptions);