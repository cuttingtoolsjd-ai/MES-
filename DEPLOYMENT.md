# Deployment Guide - Korv Factory App

## Quick Deployment to Vercel (Recommended)

### 1. Prerequisites
- GitHub account
- Vercel account (free tier available)
- Supabase project set up

### 2. Deploy Steps

#### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Connect to your GitHub account
# - Choose project settings
# - Add environment variables
```

#### Option B: Deploy via GitHub + Vercel
1. Push your code to GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables (see below)
6. Deploy!

### 3. Environment Variables for Production

In your Vercel dashboard, add these environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://kxepeapbiupctsvmkcjn.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4ZXBlYXBiaXVwY3Rzdm1rY2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjM2MjQsImV4cCI6MjA3NTgzOTYyNH0.y0yRpuFBwo2bzNHxYWV4oZowwsg5gA6NijMWS6xQGvY
```

## Alternative Deployment Options

### Netlify
1. Build the app: `npm run build`
2. Upload the `out` folder to Netlify
3. Set environment variables in Netlify dashboard

### Self-Hosted
1. Build the app: `npm run build`
2. Start production server: `npm start`
3. Use PM2 or similar for process management
4. Set up reverse proxy with Nginx

## Pre-Deployment Checklist

- [ ] Database tables created in Supabase
- [ ] Initial users inserted
- [ ] Environment variables configured
- [ ] Application tested locally
- [ ] Row Level Security policies set up (if needed)
- [ ] Domain configured (if using custom domain)

## Production Considerations

### Security
- Consider hashing PINs instead of storing plain text
- Set up proper Row Level Security policies
- Review Supabase authentication settings
- Enable HTTPS (automatic with Vercel)

### Performance
- Next.js automatically optimizes the build
- Images are optimized by default
- Static pages are pre-rendered
- Consider adding a CDN for global users

### Monitoring
- Set up error tracking (Sentry, etc.)
- Monitor Supabase usage and quotas
- Set up uptime monitoring
- Review application logs regularly

## Troubleshooting

### Common Issues
1. **Environment variables not working**: Make sure they start with `NEXT_PUBLIC_`
2. **Database connection fails**: Check Supabase project URL and API key
3. **Build fails**: Ensure all dependencies are in package.json
4. **404 on refresh**: Configure server to handle client-side routing

### Getting Help
- Check Next.js documentation: https://nextjs.org/docs
- Supabase documentation: https://supabase.com/docs
- Vercel documentation: https://vercel.com/docs