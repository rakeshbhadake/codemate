# Codemate - Testing Guide

## 🧪 Comprehensive Testing Instructions

This guide helps you verify all features of Codemate are working correctly.

---

## 📋 Pre-Testing Checklist

- [ ] Application loads successfully
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls
- [ ] Dark/light mode toggle works

---

## 1️⃣ Authentication Testing

### Test 1.1: User Registration

**Steps:**
1. Open the application
2. Click "Don't have an account? Register"
3. Fill in the form:
   - Name: `Test User 1`
   - Email: `testuser1@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
4. Click "Create Account"

**Expected Result:**
- ✅ Account created successfully
- ✅ Automatically logged in
- ✅ Redirected to dashboard
- ✅ User name appears in navbar

**Test Status:** ☐ Pass ☐ Fail

---

### Test 1.2: User Login

**Steps:**
1. Log out if logged in
2. Click "Sign In"
3. Enter credentials:
   - Email: `testuser1@example.com`
   - Password: `password123`
4. Click "Sign In"

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ User data loaded

**Test Status:** ☐ Pass ☐ Fail

---

### Test 1.3: Invalid Credentials

**Steps:**
1. Try logging in with wrong password
2. Enter: `testuser1@example.com` / `wrongpassword`

**Expected Result:**
- ✅ Error message displayed
- ✅ Not logged in

**Test Status:** ☐ Pass ☐ Fail

---

## 2️⃣ Profile Management Testing

### Test 2.1: Create Profile

**Steps:**
1. Log in as Test User 1
2. Navigate to "Profile" tab
3. Fill in profile:
   - Bio: `Full-stack developer passionate about AI`
   - Location: `San Francisco`
   - Availability: `Available`
   - Skills: Add `React`, `TypeScript`, `Node.js`
4. Click "Save Changes"

**Expected Result:**
- ✅ Success message displayed
- ✅ Profile preview updates
- ✅ Changes persist after refresh

**Test Status:** ☐ Pass ☐ Fail

---

### Test 2.2: Edit Profile

**Steps:**
1. Update bio to: `Senior full-stack developer`
2. Add new skill: `Python`
3. Change availability to: `Busy`
4. Save changes

**Expected Result:**
- ✅ All changes saved
- ✅ Preview reflects updates

**Test Status:** ☐ Pass ☐ Fail

---

## 3️⃣ Discovery & Matching Testing

### Test 3.1: Create Second User

**Steps:**
1. Log out
2. Register second account:
   - Name: `Test User 2`
   - Email: `testuser2@example.com`
   - Password: `password123`
3. Set up profile:
   - Skills: `Python`, `Django`, `React`
   - Location: `San Francisco`
   - Availability: `Available`

**Expected Result:**
- ✅ Second account created
- ✅ Profile set up

**Test Status:** ☐ Pass ☐ Fail

---

### Test 3.2: Browse Users

**Steps:**
1. Log in as Test User 1
2. Navigate to "Discover" tab
3. View all users

**Expected Result:**
- ✅ Test User 2 visible in list
- ✅ Profile information displayed
- ✅ Skills shown correctly

**Test Status:** ☐ Pass ☐ Fail

---

### Test 3.3: Filter Users

**Steps:**
1. Set filters:
   - Location: `San Francisco`
   - Skills: Add `Python`
2. View results

**Expected Result:**
- ✅ Only users matching filters shown
- ✅ Test User 2 visible (has Python + SF)

**Test Status:** ☐ Pass ☐ Fail

---

### Test 3.4: AI-Powered Search (Optional - requires API key)

**Steps:**
1. Enter query: `Find me a Python developer`
2. Click "AI-Powered Search"

**Expected Result:**
- ✅ AI processes query
- ✅ Relevant matches returned
- ✅ OR "Rule-based matching" message if no API key

**Test Status:** ☐ Pass ☐ Fail ☐ N/A (no API key)

---

### Test 3.5: AI Chat (Optional - requires API key)

**Steps:**
1. Go to "Discover" > "AI Chat" tab
2. Type: `I need a React developer for a startup`
3. Send message

**Expected Result:**
- ✅ AI responds with recommendations
- ✅ OR message about API key if not configured

**Test Status:** ☐ Pass ☐ Fail ☐ N/A (no API key)

---

## 4️⃣ Social Features Testing

### Test 4.1: Follow User

**Steps:**
1. Log in as Test User 1
2. Go to "Discover"
3. Find Test User 2
4. Click "Follow"

**Expected Result:**
- ✅ Button changes to "Unfollow"
- ✅ Following count increases (visible in Profile)

**Test Status:** ☐ Pass ☐ Fail

---

### Test 4.2: Unfollow User

**Steps:**
1. Click "Unfollow" on Test User 2

**Expected Result:**
- ✅ Button changes to "Follow"
- ✅ Following count decreases

**Test Status:** ☐ Pass ☐ Fail

---

### Test 4.3: Follower Count

**Steps:**
1. Log in as Test User 2
2. Check follower count in Profile

**Expected Result:**
- ✅ Shows 1 follower (if Test User 1 is following)
- ✅ Count updates correctly

**Test Status:** ☐ Pass ☐ Fail

---

## 5️⃣ Events Testing

### Test 5.1: Create Event

**Steps:**
1. Log in as Test User 1
2. Navigate to "Events" tab
3. Click "Create Event / Hackathon Post"
4. Fill in:
   - Title: `Annual Hackathon 2025`
   - Description: `48-hour coding competition`
   - Date: Select future date/time
   - Location: `San Francisco`
   - Link: `https://hackathon.example.com`
   - Required Skills: `React`, `Node.js`
5. Click "Create Event"

**Expected Result:**
- ✅ Event created
- ✅ Appears in feed
- ✅ All details displayed correctly

**Test Status:** ☐ Pass ☐ Fail

---

### Test 5.2: Like Event

**Steps:**
1. Log in as Test User 2
2. Go to "Events"
3. Find the event created by Test User 1
4. Click the heart icon

**Expected Result:**
- ✅ Heart fills in red
- ✅ Like count increases to 1

**Test Status:** ☐ Pass ☐ Fail

---

### Test 5.3: Unlike Event

**Steps:**
1. Click heart icon again

**Expected Result:**
- ✅ Heart becomes empty
- ✅ Like count decreases to 0

**Test Status:** ☐ Pass ☐ Fail

---

### Test 5.4: Comment on Event

**Steps:**
1. Click comment icon on event
2. Type comment: `Sounds interesting! I'd like to join.`
3. Click "Post"

**Expected Result:**
- ✅ Comment appears in list
- ✅ Comment count increases
- ✅ User name and timestamp shown

**Test Status:** ☐ Pass ☐ Fail

---

### Test 5.5: View Comments

**Steps:**
1. Close comment modal
2. Click comment icon again

**Expected Result:**
- ✅ Previously posted comment visible
- ✅ Sorted by oldest first

**Test Status:** ☐ Pass ☐ Fail

---

## 6️⃣ Messaging Testing

### Test 6.1: Send First Message

**Steps:**
1. Log in as Test User 1
2. Go to "Discover"
3. Find Test User 2
4. Click "Message"
5. Type: `Hi! Let's collaborate on a project.`
6. Send message

**Expected Result:**
- ✅ Redirected to Messages tab
- ✅ Message sent successfully
- ✅ Message appears in chat

**Test Status:** ☐ Pass ☐ Fail

---

### Test 6.2: Receive and Reply

**Steps:**
1. Log out and log in as Test User 2
2. Go to "Messages" tab
3. Click on conversation with Test User 1
4. Type reply: `Sure! What did you have in mind?`
5. Send

**Expected Result:**
- ✅ Conversation visible in list
- ✅ Last message preview shown
- ✅ Reply sent successfully
- ✅ Both messages visible in order

**Test Status:** ☐ Pass ☐ Fail

---

### Test 6.3: Message Polling

**Steps:**
1. Keep Test User 2's chat window open
2. In another browser/incognito window, log in as Test User 1
3. Send a new message to Test User 2
4. Wait 3-5 seconds

**Expected Result:**
- ✅ New message appears in Test User 2's chat
- ✅ No manual refresh needed

**Test Status:** ☐ Pass ☐ Fail

---

### Test 6.4: Conversation List

**Steps:**
1. Log in as Test User 1
2. Go to "Messages"
3. View conversation list

**Expected Result:**
- ✅ Conversation with Test User 2 shown
- ✅ Last message preview displayed
- ✅ Time stamp shown

**Test Status:** ☐ Pass ☐ Fail

---

## 7️⃣ UI/UX Testing

### Test 7.1: Dark Mode

**Steps:**
1. Click moon/sun icon in navbar
2. Toggle between light and dark modes

**Expected Result:**
- ✅ Theme switches immediately
- ✅ All components update correctly
- ✅ Preference persists after refresh

**Test Status:** ☐ Pass ☐ Fail

---

### Test 7.2: Responsive Design - Mobile

**Steps:**
1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone or Android device
4. Navigate through all tabs

**Expected Result:**
- ✅ Layout adjusts for mobile
- ✅ Bottom navigation visible
- ✅ All features accessible
- ✅ No horizontal scrolling

**Test Status:** ☐ Pass ☐ Fail

---

### Test 7.3: Responsive Design - Tablet

**Steps:**
1. Select iPad in device toolbar
2. Test all features

**Expected Result:**
- ✅ Optimized tablet layout
- ✅ Navigation works correctly
- ✅ Cards display properly

**Test Status:** ☐ Pass ☐ Fail

---

### Test 7.4: Loading States

**Steps:**
1. Open Network tab in DevTools
2. Throttle to "Slow 3G"
3. Navigate between tabs

**Expected Result:**
- ✅ Loading spinners show
- ✅ No blank pages
- ✅ Graceful loading

**Test Status:** ☐ Pass ☐ Fail

---

## 8️⃣ Error Handling Testing

### Test 8.1: Network Error Simulation

**Steps:**
1. Open DevTools Network tab
2. Set to "Offline"
3. Try to create an event

**Expected Result:**
- ✅ Error message displayed
- ✅ App doesn't crash
- ✅ User informed of issue

**Test Status:** ☐ Pass ☐ Fail

---

### Test 8.2: Invalid Form Submission

**Steps:**
1. Try to create event with empty title
2. Submit form

**Expected Result:**
- ✅ Validation error shown
- ✅ Form not submitted
- ✅ Error message clear

**Test Status:** ☐ Pass ☐ Fail

---

## 9️⃣ Session Testing

### Test 9.1: Session Persistence

**Steps:**
1. Log in
2. Close browser tab
3. Open new tab to application
4. Navigate to site

**Expected Result:**
- ✅ Still logged in
- ✅ User data loaded
- ✅ Session maintained

**Test Status:** ☐ Pass ☐ Fail

---

### Test 9.2: Logout

**Steps:**
1. Click "Logout" button

**Expected Result:**
- ✅ Logged out successfully
- ✅ Redirected to login page
- ✅ Session cleared
- ✅ Cannot access authenticated pages

**Test Status:** ☐ Pass ☐ Fail

---

## 🔟 Performance Testing

### Test 10.1: Page Load Speed

**Steps:**
1. Open DevTools Performance tab
2. Record page load
3. Check timing

**Expected Result:**
- ✅ Initial load < 3 seconds
- ✅ Interactive < 5 seconds

**Test Status:** ☐ Pass ☐ Fail

---

### Test 10.2: Smooth Scrolling

**Steps:**
1. Navigate to Events feed
2. Scroll up and down

**Expected Result:**
- ✅ Smooth scrolling
- ✅ No lag or jank
- ✅ Images load properly

**Test Status:** ☐ Pass ☐ Fail

---

## 📊 Testing Summary

| Category | Total Tests | Passed | Failed | N/A |
|----------|-------------|--------|--------|-----|
| Authentication | 3 | | | |
| Profile | 2 | | | |
| Discovery | 5 | | | |
| Social | 3 | | | |
| Events | 5 | | | |
| Messaging | 4 | | | |
| UI/UX | 4 | | | |
| Errors | 2 | | | |
| Session | 2 | | | |
| Performance | 2 | | | |
| **TOTAL** | **32** | | | |

---

## 🐛 Bug Report Template

If you find a bug, document it:

```
**Bug Title:** [Short description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Browser:** [Chrome/Firefox/Safari]
**Console Errors:** [Any errors in console]
**Screenshots:** [If applicable]
```

---

## ✅ Testing Completion

After completing all tests:

- [ ] All core features work
- [ ] No critical bugs found
- [ ] UI is responsive
- [ ] Performance is acceptable
- [ ] Error handling works
- [ ] Documentation is accurate

---

**Testing Date:** _______________  
**Tested By:** _______________  
**Overall Result:** ☐ Pass ☐ Fail  
**Notes:** _____________________

---

**Happy Testing! 🧪**
