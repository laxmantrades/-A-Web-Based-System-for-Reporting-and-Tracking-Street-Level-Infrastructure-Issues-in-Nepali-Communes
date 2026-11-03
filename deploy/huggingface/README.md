---
title: MeroSadak Classifier
emoji: 🛣️
colorFrom: red
colorTo: blue
sdk: docker
app_port: 8000
pinned: false
---

# MeroSadak AI photo check

The CLIP spam classifier for MeroSadak (my final-year project). It tells ward
staff whether a report photo looks like a real street photo or spam.

- `GET /health`: check it's running
- `POST /classify` with `{ "imageUrl": "https://res.cloudinary.com/..." }`

Only Cloudinary image links are accepted.
