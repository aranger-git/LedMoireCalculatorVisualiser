# GitHub in 5 minutes (for RSE)

## The words you'll see

| Word | What it means in our world |
|---|---|
| **Repository (repo)** | The project folder, stored online, with its full history. |
| **Commit** | A saved version with a note like "added 2.6 mm tile". It works like a revision on a plot. |
| **Branch** | A working copy for changes, so the live version stays safe until they're approved. |
| **main** | The official version. Whatever is on `main` is what gets published. |
| **Pull Request (PR)** | A request to move changes from a branch into `main`. You review them, then click **Merge**. |
| **GitHub Pages** | Free hosting that turns this repo into a public website. |

## How we'll work

1. Claude does the work on a branch (e.g. `claude/charming-newton-fwfzjz`) and pushes it.
2. A **Pull Request** is opened. You get a page that shows exactly what changed.
3. You look at it (or test the preview) and click **Merge pull request**.
4. The change lands on `main`, and the website updates within a minute or two.

You never need the command line. Everything above happens on github.com.

## One-time setup: turn on the website

Do this after the first merge into `main`:

1. Go to the repo on github.com and open **Settings**, then **Pages** (left menu).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set the branch to `main` and the folder to `/ (root)`, then click **Save**.
4. After about a minute, the page shows your URL:
   `https://aranger-git.github.io/LedMoireCalculatorVisualiser/`

## Private or public?

- **Public repo:** the free Pages site works. Anyone could read the code, but there's nothing sensitive in it.
- **Private repo:** Pages needs a paid GitHub plan (Pro or Team).
- **Never commit client drawings, contracts or pricing.** The `private/` folder is ignored on purpose.

## Letting your team edit the data

- Go to **Settings**, then **Collaborators**, then **Add people**, and invite the person's GitHub username.
- They can edit `data/led-tiles.json` on the website with the ✏️ icon.
