"""
MeroSadak AI photo check (the CLIP spam classifier).

What this does: when a citizen uploads a photo, we want to know if it is a
real photo of a street problem, or just spam (like a chair, a trading chart
screenshot, a selfie or a meme). The officer dashboard shows the answer as a
hint.

It does NOT check if the citizen picked the right category. For example a
drain photo sent as "pothole" is still a real report, so it counts as genuine.

How it works: I use CLIP, a model that can compare a picture with sentences.
I don't need to train anything. I just write a few sentences for "real street
photo" and a few for each spam type (they are in prompts.py), and CLIP says
how well the photo matches each sentence.

The score is the total probability that went to the "real street" sentences,
so it is between 0 and 1. Close to 1 means it looks like a real street photo,
close to 0 means it is probably spam. prompts.py turns the score into
"Looks genuine", "Unsure" or "Likely spam".

Endpoints:
  POST /classify  { imageUrl or image, category? }   the Node server uses this
  POST /score     same thing, an older name that I kept so old scripts still work
     -> returns { score, version, result, spam, reason, top }
  GET  /health    just to check the service is running
"""
import base64
import binascii
import io
import os
from urllib.parse import urlparse

import httpx
import torch
from fastapi import FastAPI, HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel
from transformers import CLIPModel, CLIPProcessor

from prompts import SPAM_TYPES, all_prompts, interpret

# Which CLIP model to use and the version name we save with each result.
# Both can be changed with environment variables, but these are the defaults.
MODEL_NAME = os.getenv("CLIP_MODEL", "openai/clip-vit-base-patch32")
VERSION = os.getenv("CLASSIFIER_VERSION", "clip-spam-v3")
# We only download images from these websites. Otherwise someone could send
# any URL and make our server request it (this is called SSRF). All the
# report photos are on Cloudinary, so that is the only one allowed by default.
ALLOWED_IMAGE_HOSTS = {
    h.strip()
    for h in os.getenv("ALLOWED_IMAGE_HOSTS", "res.cloudinary.com").split(",")
    if h.strip()
}
# 10 MB limit so nobody can send a giant file.
MAX_IMAGE_BYTES = 10 * 1024 * 1024

# Get all the sentences (prompts) and a matching list that says which group
# each sentence belongs to ("genuine" or a spam type like "furniture").
PROMPTS, LABELS = all_prompts()
# The six report categories. This list has to be the same as CATEGORIES in
# server/src/models/Report.js.
CATEGORIES = ["pothole", "road_sign", "streetlight", "road_marking", "footpath", "drain"]

# Load the model when the service starts. The first time, it downloads about
# 600 MB, so it is slow. After that it is cached.
print(f"[classifier] loading {MODEL_NAME} ...", flush=True)
# We are only using the model, not training it, so we turn off gradients.
# This makes it faster and uses less memory.
torch.set_grad_enabled(False)
model = CLIPModel.from_pretrained(MODEL_NAME).eval()
processor = CLIPProcessor.from_pretrained(MODEL_NAME)


def _normalise(t):
    # Make every vector length 1, so comparing them is just a dot product
    # (this is the same as cosine similarity).
    return t / t.norm(dim=-1, keepdim=True)


# The sentences never change, so I turn them into vectors once here at the
# start instead of doing it again for every photo.
TEXT_EMBEDDINGS = _normalise(
    model.get_text_features(**processor(text=PROMPTS, return_tensors="pt", padding=True))
)
# CLIP's own scaling number. It makes the probabilities sharper after softmax.
LOGIT_SCALE = model.logit_scale.exp().item()
print(f"[classifier] ready ({VERSION})", flush=True)

app = FastAPI(title="MeroSadak classifier")


class ScoreRequest(BaseModel):
    # What a request can contain. You send either image or imageUrl.
    # category is accepted but not used, because the spam check doesn't care
    # which category the citizen picked.
    category: str | None = None
    image: str | None = None  # the photo itself as base64 text (used by my evaluation scripts)
    imageUrl: str | None = None  # a Cloudinary link to the photo (used by the Node server)
    filename: str | None = None  # not used, just allowed so requests with it don't fail


def _fetch(url):
    # Download the photo from a URL, but only if it is https and from an
    # allowed host (see ALLOWED_IMAGE_HOSTS above).
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_IMAGE_HOSTS:
        raise HTTPException(400, "imageUrl host is not allowed")
    try:
        res = httpx.get(url, timeout=5.0)
    except httpx.HTTPError as err:
        raise HTTPException(502, f"could not fetch image: {err}") from err
    if res.status_code != 200:
        raise HTTPException(502, f"image fetch returned {res.status_code}")
    return res.content


def _load_image(req):
    # Get the photo bytes, either from the base64 text or from the URL.
    if req.image:
        try:
            data = base64.b64decode(req.image, validate=True)
        except (binascii.Error, ValueError) as err:
            raise HTTPException(400, "image is not valid base64") from err
    elif req.imageUrl:
        data = _fetch(req.imageUrl)
    else:
        raise HTTPException(400, "send either image or imageUrl")

    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "image too large")
    try:
        img = Image.open(io.BytesIO(data))
        # Phone photos are sometimes saved sideways with a note (EXIF) saying
        # which way is up. exif_transpose rotates it the right way. Then we
        # convert to RGB because CLIP expects 3 colour channels.
        return ImageOps.exif_transpose(img).convert("RGB")
    except (UnidentifiedImageError, OSError) as err:
        raise HTTPException(400, "not a readable image") from err


@app.get("/health")
def health():
    # Simple check to see if the service is up and which version it is.
    return {"ok": True, "model": MODEL_NAME, "version": VERSION}


# The same function answers both /classify and /score.
@app.post("/classify")
@app.post("/score")
def score(req: ScoreRequest):
    if req.category is not None and req.category not in CATEGORIES:
        raise HTTPException(400, f"unknown category '{req.category}'")

    # Turn the photo into a vector, the same way as the sentences.
    pixels = processor(images=_load_image(req), return_tensors="pt")
    image_embedding = _normalise(model.get_image_features(**pixels))
    # Compare the photo with every sentence at once (dot product), then use
    # softmax so all the numbers add up to 1, like probabilities.
    probs = (LOGIT_SCALE * image_embedding @ TEXT_EMBEDDINGS.T).softmax(dim=-1)[0]
    # prompts.py adds up the probabilities and decides the result.
    score, result, reason = interpret(probs.tolist(), LABELS)

    # Find the short spam key (like "furniture") that matches the reason.
    # It stays None when the photo looks genuine.
    spam = next((k for k, (_, r) in SPAM_TYPES.items() if r == reason), None)
    return {
        "score": round(score, 4),
        "version": VERSION,
        "result": result,  # "Looks genuine", "Unsure" or "Likely spam"
        "spam": spam,
        "reason": reason,  # for example "Looks like a chart"
        # The one sentence that matched best. Useful when I want to see why
        # it got a photo wrong.
        "top": PROMPTS[int(probs.argmax())],
    }
