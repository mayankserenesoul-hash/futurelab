# FutureLab: setup guide (Windows)

Ask "What if?" Explore what could happen.

## 1. Install Node.js (once)
Download the LTS version from https://nodejs.org, install it, then open a NEW
PowerShell window and check:

    node -v
    npm -v

## 2. Unzip
Right-click futurelab.zip -> Extract All. Put the folder somewhere simple,
for example E:\Projects\futurelab. Open PowerShell inside that folder:

    cd E:\Projects\futurelab

(You should see package.json when you run `dir`.)

## 3. Install everything
Run these two commands, one at a time:

    npm install
    npm --prefix server install

## 4. Add your Gemini key
    copy .env.example .env

Open the new .env file in VS Code / Notepad and replace
your_gemini_api_key_here with your real key. No quotes, no spaces.

## 5. Check the math (optional but recommended)
    npm test

Expected: tests 17, pass 17, fail 0.

## 6. Start the app
    npm run dev:all

Open http://localhost:5173

- Landing page: http://localhost:5173
- Lab:          http://localhost:5173/lab
- API health:   http://localhost:5000/api/health

Stop with Ctrl + C. If you change .env, stop and start again.

## Troubleshooting
- "npm is not recognized": install Node.js, then reopen PowerShell.
- "Cannot find module ...": you skipped step 3.
- AI errors in the Lab: check GEMINI_API_KEY in .env, then restart.
- Port 5000 busy: set PORT=5001 in .env AND change the proxy target in
  vite.config.js to http://localhost:5001.
