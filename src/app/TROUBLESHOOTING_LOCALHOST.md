# Troubleshooting Localhost Issues

## Profile Update "API Request Failed" Error

If you're experiencing "API request failed" errors when updating your profile on localhost, follow these debugging steps:

### 1. Check Browser Console
Open your browser's developer tools (F12) and check the Console tab for detailed error messages. The app now logs:
- API request URLs
- Request/response details
- Full error messages

### 2. Verify Server Status
The Codemate app uses Supabase Edge Functions as the backend. When running locally, make sure:
- You have internet connection (the server is hosted on Supabase, not locally)
- The Supabase project is active
- Check the health endpoint: `https://niuhkqjbsmgnsyvgiway.supabase.co/functions/v1/make-server-9386b22c/health`

### 3. Check Authentication Token
The profile update requires authentication. Verify:
- You're properly logged in
- Your access token is stored in localStorage (check Application > Local Storage in DevTools)
- The token hasn't expired (try logging out and back in)

### 4. Network Tab Investigation
In DevTools Network tab, look for the profile update request:
- URL should be: `https://niuhkqjbsmgnsyvgiway.supabase.co/functions/v1/make-server-9386b22c/profile`
- Method: PUT
- Check the request headers (should include Authorization)
- Check the request payload (should contain your profile data)
- Look at the response status and body

### 5. CORS Issues
If you see CORS errors:
- The server is configured to allow all origins (`origin: "*"`)
- CORS errors usually indicate the server isn't responding at all
- Check if you can access the health endpoint directly in your browser

### 6. Common Solutions

#### Solution 1: Clear Cache and Reload
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

#### Solution 2: Re-authenticate
```
1. Click "Logout"
2. Clear localStorage (Application > Local Storage > Clear All)
3. Log back in
```

#### Solution 3: Check Supabase Status
```
1. Visit https://status.supabase.com/
2. Ensure all systems are operational
```

### 7. Server-Side Logs
The server now includes detailed logging for profile updates:
- "Profile update request received"
- "Profile update for user: [userId]"
- "Profile updates: [data]"
- "Profile updated successfully"

These logs can be viewed in the Supabase dashboard under Edge Functions > Logs.

### 8. Manual Testing with cURL

Test the endpoint directly:
```bash
curl -X PUT \
  https://niuhkqjbsmgnsyvgiway.supabase.co/functions/v1/make-server-9386b22c/profile \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{
    "name": "Test User",
    "bio": "Test bio",
    "location": "Test Location",
    "availability": "available",
    "skills": ["JavaScript", "React"]
  }'
```

Replace `YOUR_ACCESS_TOKEN` with your actual token from localStorage.

## Still Having Issues?

If none of these solutions work:
1. Check all console logs (both browser and server)
2. Verify your internet connection is stable
3. Try from a different browser
4. Check if other API calls work (like loading the dashboard)
5. Review the browser's Network tab for failed requests and their error messages
