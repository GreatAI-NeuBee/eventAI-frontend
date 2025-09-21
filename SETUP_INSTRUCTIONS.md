# Setup Instructions for EventAI Frontend

## Environment Variables Setup

To fix the Supabase redirect issue, you need to create a `.env` file in the root directory with your Supabase credentials:

1. Create a `.env` file in the root directory (same level as package.json)
2. Add the following content:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Development Configuration  
VITE_APP_URL=http://localhost:5173
```

## How to get your Supabase credentials:

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project (or create a new one)
4. Go to Settings > API
5. Copy the "Project URL" and "anon public" key
6. Replace the placeholder values in your `.env` file

## Supabase Auth Configuration:

In your Supabase dashboard:
1. Go to Authentication > Settings
2. Under "Site URL", add: `http://localhost:5173`
3. Under "Redirect URLs", add: `http://localhost:5173/dashboard`
4. Save the changes

## After setup:

1. Restart your development server: `npm run dev`
2. The authentication should now redirect properly to localhost instead of Supabase

## Current Fixes Applied:

✅ Fixed TypeScript build errors
✅ Fixed authentication redirect URL to use localhost
✅ Added proper error handling for missing environment variables
✅ Added PKCE flow for better security
