# LSU Daily Trivia — Setup Guide

This guide assumes you've never used GitHub or Vercel before. Follow it in
order, top to bottom. Nothing here requires writing code.

---

## Step 1: Create your puzzle Google Sheet

1. Go to sheets.google.com and create a new blank sheet.
2. In **row 1**, type these exact column headers, one per cell, left to right:
   `date | answer | isRival | clue1 | clue2 | clue3 | clue4 | clue5`
3. In **row 2** onward, add one puzzle per row:
   - `date` — format `YYYY-MM-DD`, e.g. `2026-07-01`
   - `answer` — e.g. `Joe Burrow`
   - `isRival` — type `TRUE` if the answer played against LSU, otherwise `FALSE`
   - `clue1`–`clue5` — hardest to easiest
4. Click **File → Share → Publish to web**.
5. Under "Link," make sure it says **Entire document** and the format
   dropdown says **Comma-separated values (.csv)**. Click **Publish**.
6. Copy the link it gives you. It will look like:
   `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv`
   Save this link — you'll paste it into Vercel in Step 4.

You can edit this sheet any time, including adding future dates in advance.
The site always shows whichever row matches today's date (or the most
recent past date if today isn't filled in yet).

---

## Step 2: Create a GitHub account

1. Go to github.com and click **Sign up**. Use your email, pick a username,
   verify your email. Free plan is all you need.

---

## Step 3: Upload this project to GitHub

1. On github.com, click the **+** icon top-right → **New repository**.
2. Name it `lsu-daily-trivia`. Keep it **Public** or **Private**, your
   choice. Don't check any of the optional boxes. Click **Create repository**.
3. On the next page, click **uploading an existing file**.
4. Drag the entire contents of this project folder (everything inside the
   `lsu-trivia` folder you downloaded — not the folder itself, the files
   and subfolders inside it) into the upload box.
5. Scroll down, click **Commit changes**.

---

## Step 4: Deploy on Vercel

1. Go to vercel.com → **Sign up** → choose **Continue with GitHub** and
   approve the connection.
2. Click **Add New → Project**.
3. Find `lsu-daily-trivia` in the list and click **Import**.
4. Before clicking deploy, expand **Environment Variables** and add:
   - Name: `SHEET_CSV_URL`
   - Value: the link you copied in Step 1.6
5. Click **Deploy**. Wait about a minute.
6. You'll get a free URL like `lsu-daily-trivia.vercel.app` — click it.
   Your trivia game is now live on the internet.

---

## Step 5: Connect your real domain (once you've bought one)

1. Buy the domain (Namecheap, Squarespace Domains, etc).
2. In your Vercel project, go to **Settings → Domains**, type your domain,
   click **Add**.
3. Vercel will show you 1–2 DNS records (a couple of lines of text/numbers).
4. Go to your domain registrar's site, find **DNS settings**, and add
   those exact records.
5. Wait 10–60 minutes. Vercel will show a green checkmark once it's
   connected.

---

## How daily updates work going forward

Just open your Google Sheet and add a new row with tomorrow's date and a
new puzzle. That's it — nothing to redeploy, nothing to touch on GitHub or
Vercel. The site re-checks the sheet every time someone visits.

## Getting help with changes later

Anytime you want the site to look different, add a page, add a logo, etc.,
just share this same project with me again and describe what you want —
I can edit any of these files directly.
