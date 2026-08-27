# MeroSadak — web client

React + Vite + Tailwind CSS single-page app. Right now it contains the
**homepage** only; the report form, tracking view and officer dashboard are
placeholder routes (`ComingSoon`) that will be built in later sprints.

## Scripts

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

## Structure

```
src/
├── main.jsx              mounts <App> inside <BrowserRouter>
├── App.jsx               Navbar + Footer + <Routes>
├── index.css             Tailwind directives + a few component classes
├── pages/
│   ├── Home.jsx          the homepage: a stack of sections
│   └── ComingSoon.jsx    placeholder for routes not built yet
├── components/           one file per section (Hero, HowItWorks, ...)
└── data/
    ├── site.js           site name, nav links, tagline, stats
    ├── categories.js     the 6 fixed street-issue categories
    └── steps.js          the 3 "how it works" steps
```

Text and lists live in `src/data/` so copy can be edited (and later translated
to Nepali) without touching component code.

## Styling

Tailwind utility classes, configured in `tailwind.config.js`:
- `brand` colour scale (crimson) + `ink` text colours
- `.btn-primary`, `.btn-ghost`, `.section-shell` component classes in `index.css`

Icons come from [`lucide-react`](https://lucide.dev).
