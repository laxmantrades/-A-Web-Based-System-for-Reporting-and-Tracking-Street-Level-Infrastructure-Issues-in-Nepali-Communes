"""
The sentences (prompts) that CLIP compares each photo with, and the rule that
turns the score into a result.

There is one group of sentences for real street photos, and 12 groups for the
spam types. The score is how much of the probability went to the real street
sentences (between 0 and 1):
  0.7 or more   -> "Looks genuine"
  less than 0.3 -> "Likely spam"
  in between    -> "Unsure"
This is only a hint for the officers. They make the real decision, and
citizens never see it.
"""

# ---------------------------------------------------------------------------
# Real street photos. One sentence for each of the six report types, plus a
# few general ones about streets and roads.
# ---------------------------------------------------------------------------
GENUINE_PROMPTS = [
    "a photo of a pothole in a road",
    "a photo of a damaged road surface",
    "a photo of a damaged or fallen road sign",
    "a photo of a broken street light on a pole",
    "a photo of faded road markings on a street",
    "a photo of a broken footpath or sidewalk",
    "a photo of a blocked roadside drain",
    "a photo of a street in a town in Nepal",
    "a photo of a road taken from the roadside",
]

# ---------------------------------------------------------------------------
# The 12 spam types. Each one is:
#   key: (list of sentences, the reason the officer sees)
# ---------------------------------------------------------------------------
SPAM_TYPES = {
    "furniture": (
        ["a photo of furniture", "a photo of a sofa, chair or table"],
        "Looks like furniture",
    ),
    "chart": (
        ["a stock market trading chart", "a screenshot of a price chart with candlesticks"],
        "Looks like a chart",
    ),
    "screenshot": (
        ["a screenshot of a phone screen", "a screenshot of an app or website"],
        "Looks like a screenshot",
    ),
    "selfie": (
        ["a selfie of a person", "a close-up photo of a person's face"],
        "Looks like a selfie",
    ),
    "food": (
        ["a photo of food on a plate", "a photo of a meal"],
        "Looks like food",
    ),
    "animal": (
        ["a photo of a pet", "a close-up photo of an animal"],
        "Looks like an animal",
    ),
    "document": (
        ["a photo of a paper document with text", "a photo of a receipt, form or ID card"],
        "Looks like a document",
    ),
    "meme": (
        ["a meme with text on it", "a cartoon or drawing"],
        "Looks like a meme or drawing",
    ),
    "blank": (
        ["a completely black image", "a very blurry photo of nothing"],
        "Image is blank or too blurry",
    ),
    "indoor": (
        ["a photo of an indoor room", "a photo inside a house, office or shop"],
        "Looks like an indoor room",
    ),
    "landscape": (
        ["a photo of mountains and sky", "a nature landscape with no road"],
        "Looks like a landscape",
    ),
    "group": (
        ["a group photo of people posing", "a photo of people at an event"],
        "Looks like a photo of people",
    ),
}

# The two cut-off points. In my evaluation (thesis Section 4.5) I tried other
# values too, but none of them did better, so I kept these.
GENUINE_THRESHOLD = 0.7
SPAM_THRESHOLD = 0.3


def all_prompts():
    """
    Put all the sentences in one long list, and make a second list of the same
    length that says which group each sentence is from ("genuine" or a spam
    key). CLIP needs one flat list, and the labels help me add things up later.
    """
    prompts, labels = list(GENUINE_PROMPTS), ["genuine"] * len(GENUINE_PROMPTS)
    for key, (texts, _) in SPAM_TYPES.items():
        prompts += texts
        labels += [key] * len(texts)
    return prompts, labels


def interpret(probs, labels):
    """
    probs: the probability CLIP gave each sentence (same order as all_prompts()).
    Returns (score, result, reason) to show on the officer dashboard.
    """
    # The score is all the "genuine" probabilities added together.
    score = sum(p for p, l in zip(probs, labels) if l == "genuine")

    # Add up the probabilities for each spam type, and pick the biggest one.
    # That is the reason we show, like "Looks like food".
    spam_totals = {}
    for p, l in zip(probs, labels):
        if l != "genuine":
            spam_totals[l] = spam_totals.get(l, 0.0) + p
    top_spam = max(spam_totals, key=spam_totals.get)
    reason = SPAM_TYPES[top_spam][1]

    # Use the thresholds to decide. A genuine photo doesn't need a reason.
    if score >= GENUINE_THRESHOLD:
        return score, "Looks genuine", None
    if score < SPAM_THRESHOLD:
        return score, "Likely spam", reason
    return score, "Unsure", reason
