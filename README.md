# Sweat & Iron Pump Gym

A gym logger for the iPhone, built as a web app you add to the home screen. Two people each have their own history; you type in the names on the phone (**Edit names** on the first screen) and they stay on that phone. It works offline, keeps everything on the phone, and can back each person up to a private GitHub repo.

- **Cardio:** 10 activities with machine photos, a live timer, and per-machine settings (speed, incline, damper, resistance and so on).
- **Weightlifting:** 12 muscle groups, sets of kg × reps, warm-up sets, and a "Last time" section for progressive overload.
- **History, CSV export, JSON backup and restore.**

## Files

`index.html`, `app.js`, `icons.js`, `styles.css`, `sw.js` (offline cache), `manifest.json`, `icons/` (home-screen icon) and `images/` (machine photos). It is plain HTML/CSS/JS with no build step: just serve the folder as static files over **https**. Try it locally with `python3 -m http.server 8000` and open <http://localhost:8000>.

## Putting it on your phone

1. Host the folder at an https address (see *Hosting*).
2. Open the address in **Safari** on the iPhone.
3. Tap **Share → Add to Home Screen → Add**.
4. From then on open **Sweat & Iron** from the icon. **Only log workouts from the icon:** the home-screen app keeps its own storage, separate from anything you logged in a Safari tab.

## Hosting

The optional machine photos in `images/` are product shots from retailers' websites and belong to their owners, so they are **not** part of the public copy of this repo. Without them the app shows simple line icons instead; adding the `images/` folder back switches the photos on.

- **Private GitHub repo + Netlify (or Cloudflare Pages):** keep the code and photos in a private repo and let the host publish them. Free.
- **GitHub Pages:** free for public repos only (a private repo needs a paid plan). If you use a public repo, delete `images/` first (the app then falls back to simple line icons) or replace the photos with your own, keeping the same file names.

Every address is public to anyone who has the link, but your workouts are never on it: they live on your phone and in your private data repo.

## Backing up to GitHub

1. Create a **private** repo (for example `gym-data`) and tick **Add a README file**.
2. Create an access token: GitHub → profile picture → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - Repository access: **Only select repositories → gym-data**
   - Permissions: **Repository permissions → Contents → Read and write**
   - Expiration: the longest you are comfortable with.
3. In the app tap ⚙️ and enter your GitHub username, the repo name and the token, then **Save & sync now**.

Each person is saved in their own file, `gym-log-pink.json` and `gym-log-iron.json` (the pink and the strong button). The login is entered once per phone and shared by both. The app syncs when it opens, after you save a workout, and when the phone comes back online. A new phone gets the history back by entering the same details. The token is stored only on the phone and can only reach that one repo; if you lose the phone, delete the token on GitHub.

## Export

⚙️ Settings has **Export workouts (CSV)** (one row per set or cardio session, for spreadsheets) and **Save backup file (JSON)**, which **Restore from a backup file** reads back. On the iPhone, saving opens the share sheet: choose **Save to Files** to put it in iCloud Drive.

- **Excel in a European locale** may expect semicolons and show the CSV in one column. Use *Data → From Text/CSV* and choose comma, or open it in Numbers or Google Sheets.
- **Deleted sessions stay deleted:** restoring a backup will not bring back a session you deleted on purpose.

## Updating the app

Replace the changed files on the host. The phone picks up the new version the next time the app opens with a connection; if it still shows the old one, close the app and open it again.
