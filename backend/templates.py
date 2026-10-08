"""Industry template packs: services + FAQ seeds + follow-up/recovery openers.
Picker fills EMPTY profile fields only — never overwrites the owner's words.
Industries: dental | salon | real_estate | coaching | restaurant.
"""

PACKS = {
    "dental": {
        "label": "Dental clinic",
        "services": "Cleaning & polishing\nRoot canal treatment\nBraces & aligners\nImplants\nTooth filling & extraction\nKids dentistry",
        "faq": [
            {"q": "What are your timings?", "a": "We are open Monday to Saturday, 10am to 8pm."},
            {"q": "Do I need an appointment?", "a": "Walk-ins are welcome, but appointments get priority — shall I book you a slot?"},
            {"q": "Do you take emergencies?", "a": "Yes — message us right away with your symptoms and we will fit you in today."},
        ],
        "openers": [
            "Hi {name}! Due for your dental checkup? We have slots this week — want me to hold one?",
        ],
    },
    "salon": {
        "label": "Salon & spa",
        "services": "Haircut & styling\nHair coloring & smoothening\nFacials & cleanup\nManicure & pedicure\nBridal packages",
        "faq": [
            {"q": "What are your timings?", "a": "Open all days, 10am to 8pm."},
            {"q": "Do I need prior booking?", "a": "Bookings get priority, especially on weekends — shall I reserve your slot?"},
            {"q": "Do you have offers running?", "a": "Offers change monthly — tell me the service and I'll check today's best price."},
        ],
        "openers": [
            "Hi {name}! It's glow-up o'clock — we have open slots this week. Shall I book yours?",
        ],
    },
    "real_estate": {
        "label": "Real estate",
        "services": "1/2/3 BHK sales\nRentals & leasing\nSite visits\nHome loans assistance\nResale & documentation",
        "faq": [
            {"q": "What are site visit timings?", "a": "Site visits daily 10am to 6pm, including weekends."},
            {"q": "Is the price negotiable?", "a": "Share the property you liked and I'll check what the owner can do."},
            {"q": "Do you help with loans?", "a": "Yes — we work with major banks and handle the paperwork with you."},
        ],
        "openers": [
            "Hi {name}! Still hunting for your {service}? A few fresh options just listed — want a site visit this weekend?",
        ],
    },
    "coaching": {
        "label": "Coaching & classes",
        "services": "Classroom batches\nOnline live classes\nTest series & mock exams\nDoubt-clearing sessions\nStudy material",
        "faq": [
            {"q": "When does the next batch start?", "a": "New batches start every month — tell me your target exam and I'll place you."},
            {"q": "Are demo classes free?", "a": "Yes — your first demo class is free. Shall I book your seat?"},
            {"q": "What are the fees?", "a": "Fees depend on the course — tell me which one and I'll share the exact plan."},
        ],
        "openers": [
            "Hi {name}! Your exam won't wait — our new batch has 5 seats left. Want a free demo seat?",
        ],
    },
    "restaurant": {
        "label": "Restaurant",
        "services": "Dine-in\nTakeaway & delivery\nFamily combos\nParty & bulk orders",
        "faq": [
            {"q": "What are your timings?", "a": "Open daily 11am to 11pm."},
            {"q": "Do you deliver?", "a": "Yes — delivery within 5 km. Tell me your order and address."},
            {"q": "Do you take party orders?", "a": "Yes! Share headcount and date and we'll plan the menu."},
        ],
        "openers": [
            "Hi {name}! Craving something good? Tonight's special is on — shall I reserve a table?",
        ],
    },
}


def get_pack(industry: str) -> dict | None:
    return PACKS.get((industry or "").lower())


def list_packs() -> list:
    return [{"id": k, "label": v["label"]} for k, v in PACKS.items()]


def apply_pack(db, user_id: str, industry: str) -> dict:
    """Fill EMPTY profile fields from the pack. Returns what changed."""
    from backend import models
    pack = get_pack(industry)
    if not pack:
        return {"status": "unknown-industry"}
    p = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.user_id == user_id).first()
    if not p:
        p = models.BusinessProfile(user_id=user_id)
        db.add(p)
    changed = []
    if not (p.industry or "").strip():
        p.industry = industry
        changed.append("industry")
    if not (p.services or "").strip():
        p.services = pack["services"]
        changed.append("services")
    if not (p.faq or []):
        p.faq = pack["faq"]
        changed.append("faq")
    db.commit()
    return {"status": "applied", "changed": changed,
            "openers": pack["openers"]}
