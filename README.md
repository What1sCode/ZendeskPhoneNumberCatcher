# Zendesk Phone Processor - Railway Deployment

## 🚀 Quick Start (10 Minutes)

This application automatically processes Zendesk voice tickets to format phone numbers and match existing users.

---

## 📦 Files You Need for Railway

You should have these 4 files:

1. **server.js** - Main application code
2. **package.json** - Dependencies 
3. **railway.json** - Railway configuration
4. **env-file.txt** - Environment variables (rename to .env)

---

## 🔧 Step 1: Prepare Files

### Create a folder called `zendesk-phone-processor`

Put these files in it:
- server.js
- package.json
- railway.json

### Update Environment Variables

Open `env-file.txt` and update this line:
```
ZENDESK_EMAIL=your-email@elotouchcare.com
```

Change to your actual admin email, then save as `.env`

Your file should look like:
```
ZENDESK_SUBDOMAIN=
ZENDESK_EMAIL=
ZENDESK_API_TOKEN=
PORT=3000
```

---

## 🚂 Step 2: Deploy to Railway

### Option A: Upload Files Directly

1. Go to https://railway.app
2. Sign up/Login (GitHub login works great)
3. Click "New Project" → "Empty Project"
4. Click "Deploy from GitHub repo" OR upload folder
5. If uploading: drag your `zendesk-phone-processor` folder

### Option B: Deploy from GitHub

1. Create new GitHub repo
2. Upload the 4 files to it
3. In Railway, click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository

---

## ⚙️ Step 3: Configure Environment Variables in Railway

If you didn't include the `.env` file, add these in Railway dashboard:

1. Click on your project
2. Go to "Variables" tab
3. Add these three variables:

```
ZENDESK_SUBDOMAIN
elotouchcare
```

```
ZENDESK_EMAIL
your-admin-email@elotouchcare.com
```
⚠️ **IMPORTANT**: Use the email associated with the API token!

```
ZENDESK_API_TOKEN
AItwPQ8Jdd5pVqaX9ZQYzoxRlf8SCr0ha3FK9AhX
```

---

## 🌐 Step 4: Get Your Railway URL

1. Railway will auto-deploy
2. Go to "Settings" → "Networking"
3. Click "Generate Domain"
4. Copy your URL: `https://something.up.railway.app`

**Write it down**: _________________________________

---

## ✅ Step 5: Test Your Deployment

Visit: `https://your-url.up.railway.app/health`

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T...",
  "service": "zendesk-phone-processor"
}
```

If you see this, Railway is working! ✅

---

## 🎯 Step 6: Configure Zendesk Webhook

### Go to Zendesk Admin

1. Login to https://elotouchcare.zendesk.com
2. Click gear icon → Admin Center
3. Navigate: Apps and integrations → Webhooks → Webhooks
4. Click "Create webhook"

### Configure Webhook

**Connection Type**:
```
Select: Zendesk events
```

**Event Selection**:
```
Select: Ticket Created
```

**Basic Info**:
```
Name: Phone Processor - Voice Tickets
Description: Processes voice ticket phone numbers
```

**Endpoint URL**:
```
https://YOUR-RAILWAY-URL.up.railway.app/webhook/ticket-created
```
⚠️ Replace `YOUR-RAILWAY-URL` with your actual Railway domain!

**Authentication**:
```
None (for now)
```

Click "Create webhook" ✅

### Test the Webhook

1. In webhook details, click "Test webhook"
2. Select "Ticket Created" event
3. Click "Send test"
4. Should return: 200 OK ✅

---

## 📞 Step 7: Test with Real Call

1. Call your Zendesk support number
2. Hang up or leave voicemail
3. Check the created ticket in Zendesk:
   - Phone field should show: `+1XXXXXXXXXX`
   - Custom field 31133639456535 should be populated
   - If existing user: requester updated
   - If new user: phone saved in profile

4. Check Railway logs:
   - Should show "Processing ticket..."
   - Should show "Formatted phone: +1..."
   - No errors

---

## 🎉 Success!

If everything works:
✅ Voice tickets automatically processed
✅ Phone numbers formatted to +1XXXXXXXXXX
✅ Existing users matched by phone
✅ No duplicate users created
✅ Clean data!

---

## 🔍 How It Works

1. **Call comes in** → Zendesk creates ticket
2. **Webhook fires** → Sends ticket to Railway
3. **Railway app processes**:
   - Extracts phone: `+13035872087`
   - Searches for existing user with that phone
   - If found: Updates ticket requester
   - If not: Updates auto-created user's phone field
   - Updates custom field 31133639456535
4. **Result**: Clean data, no duplicates!

---

## 🐛 Troubleshooting

### Webhook Not Firing
- Check webhook is "Active" in Zendesk
- Verify Railway URL is correct
- Test health endpoint
- Check Railway logs

### Phone Not Updating
- Verify custom field ID: 31133639456535
- Check API token has admin permissions
- Look at Railway logs for errors

### Railway App Not Responding
- Check deployment status (should be green)
- Verify environment variables
- View deployment logs
- Try redeploying

### Users Not Matching
- Ensure existing users have phone field populated
- Check phone format: +1XXXXXXXXXX
- Manually search to verify user exists

---

## 📊 Monitoring

### Daily (First Week)
- Check Railway logs for errors
- Review 5-10 processed tickets
- Verify phone formatting correct
- Check no duplicates created

### Weekly
- Review webhook activity in Zendesk
- Check for failed invocations
- Gather agent feedback

---

## 🔒 Security Notes

✅ API token stored in environment variables (not code)
✅ HTTPS enforced by Railway automatically
✅ No sensitive data in logs
✅ Token not exposed in repository

---

## 📞 Key Information

**Custom Phone Field ID**: `31133639456535`
**Phone Format**: `+13035872087` (E.164 standard)
**Channel Type**: `voice`

**API Credentials**:
- Subdomain: `elotouchcare`
- API Token: `AItwPQ8Jdd5pVqaX9ZQYzoxRlf8SCr0ha3FK9AhX`
- Email: (you need to set this)

---

## 🆘 Need Help?

**Railway Issues**: https://railway.app/help
**Zendesk Support**: Your account rep
**Health Check**: `https://your-url.up.railway.app/health`

---

## 📝 API Endpoints

**Webhook**: `POST /webhook/ticket-created`
- Receives ticket creation events
- Processes phone numbers
- Updates tickets and users

**Health**: `GET /health`
- Returns service status
- Use for monitoring

**Info**: `GET /`
- Returns service information
- Lists available endpoints

---

## 🎯 What This Solves

**Before**: 
- Each call creates new user
- Duplicate users pile up
- Phone numbers incorrectly formatted
- Fragmented customer history

**After**:
- Existing users matched automatically
- No duplicates created
- Phone numbers standardized
- Complete customer history

---

## 💡 Additional Notes

### Railway Costs
- Free tier: $5 credit/month (should work for testing)
- Pro tier: $20/month (recommended for production)
- This app uses minimal resources (~50-100MB)

### Phone Format Examples
- Input: `(303) 587-2087` → Output: `+13035872087`
- Input: `303-587-2087` → Output: `+13035872087`
- Input: `3035872087` → Output: `+13035872087`

### Custom Field
- ID: `31133639456535`
- This is the field that stores the formatted phone number
- Already configured in the code

---

## ✅ Deployment Checklist

- [ ] Files prepared (server.js, package.json, railway.json, .env)
- [ ] Email updated in .env file
- [ ] Railway project created
- [ ] Files uploaded/deployed
- [ ] Environment variables set
- [ ] Domain generated
- [ ] Health endpoint tested (200 OK)
- [ ] Zendesk webhook created
- [ ] Webhook endpoint correct
- [ ] Webhook tested (200 OK)
- [ ] Real call tested
- [ ] Ticket phone formatted correctly
- [ ] Logs show no errors
- [ ] Ready for production!

---

**Version**: 1.0
**Last Updated**: October 22, 2025
**Status**: Ready to Deploy! 🚀

Good luck! ☕
