# Troubleshooting Guide - Connection Issues

## Issue: "localhost refused to connect" / ERR_CONNECTION_REFUSED

### Current Status ✅
- Next.js server is running on http://localhost:3000
- Environment variables are configured
- Application files are in place

### Quick Solutions

#### 1. Verify Server is Running
Check the terminal for:
```
✓ Ready in X.Xs
- Local: http://localhost:3000
```

#### 2. Browser Issues
- **Clear browser cache**: Ctrl+Shift+R (hard refresh)
- **Try incognito mode**: Ctrl+Shift+N
- **Try different browser**: Chrome, Firefox, Edge
- **Disable browser extensions** temporarily

#### 3. Port Issues
Check if port 3000 is available:
```powershell
netstat -ano | findstr :3000
```

If port is busy, try a different port:
```bash
npm run dev -- -p 3001
```

#### 4. Firewall/Antivirus
- **Windows Firewall**: Allow Node.js through firewall
- **Antivirus**: Add project folder to exclusions
- **Corporate Network**: Check proxy settings

#### 5. Network Issues
Try accessing via:
- http://localhost:3000
- http://127.0.0.1:3000
- http://[::1]:3000

### Common Causes

1. **OneDrive Sync Issues**: Files in OneDrive can cause permission problems
2. **Node.js Path Issues**: Ensure Node.js is properly installed
3. **Project Dependencies**: Run `npm install` again if needed
4. **Port Conflicts**: Another service using port 3000

### Alternative Solutions

#### Option 1: Different Port
```bash
npx next dev -p 3001
```

#### Option 2: Network Interface
```bash
npx next dev -H 0.0.0.0
```

#### Option 3: Rebuild Dependencies
```bash
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

### Testing the Connection
Once the server is running, test these URLs:
- http://localhost:3000 (Home page)
- http://localhost:3000/login (Login page)
- http://localhost:3000/dashboard (Dashboard - requires login)

### If Still Not Working
1. Check Windows Event Viewer for errors
2. Run `npm run build` to check for build errors
3. Try creating a simple test file to isolate the issue
4. Consider moving project out of OneDrive to local folder

### Getting Help
Include this information when asking for help:
- Operating System version
- Node.js version (`node --version`)
- Browser and version
- Complete error message
- Terminal output from `npm run dev`