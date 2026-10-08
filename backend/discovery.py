"""Autonomous lead discovery: 100% FREE stack (no Places API needed).
Order: OSM (free) -> website crawl (free) -> Tavily web search (uses your existing key).
No CSV. Agent finds leads itself.
"""
import os
import re
import requests
import phonenumbers

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

PHONE_RE = re.compile(r"(\+?\d[\d\s\-()]{6,}\d)")
EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")


CITY_REGION_HINTS = {
    # Saudi / Gulf
    "riyadh": "SA", "jeddah": "SA", "saudi": "SA", "dammam": "SA", "mecca": "SA", "medina": "SA",
    "dubai": "AE", "abu dhabi": "AE", "uae": "AE", "qatar": "QA", "doha": "QA", "kuwait": "KW",
    "bahrain": "BH", "oman": "OM", "muscat": "OM",
    # India
    "india": "IN", "chennai": "IN", "mumbai": "IN", "delhi": "IN", "bangalore": "IN", "bengaluru": "IN",
    "hyderabad": "IN", "kolkata": "IN", "pune": "IN", "ahmedabad": "IN", "jaipur": "IN", "kochi": "IN",
    # Others
    "london": "GB", "uk": "GB", "new york": "US", "usa": "US", "united states": "US",
}


def guess_region(city: str, default: str = "SA") -> str:
    if not city:
        return default
    c = city.lower()
    for key, region in CITY_REGION_HINTS.items():
        if key in c:
            return region
    return default


def normalize_e164(raw: str, default_region: str = "SA", city: str = ""):
    """Return E.164 digits-only string or None. Works for IN/SA/AE/etc via city hint."""
    if not raw:
        return None
    # if caller passed city that hints another region, prefer it
    if city and default_region == "SA":
        default_region = guess_region(city, "SA")
    cleaned = raw.strip().replace("(", "").replace(")", "")
    # fast-path: already with +
    regions_to_try = [default_region]
    for r in ["SA", "IN", "AE", "US", "GB"]:
        if r not in regions_to_try:
            regions_to_try.append(r)
    for region in regions_to_try:
        try:
            num = phonenumbers.parse(cleaned, region)
            if phonenumbers.is_possible_number(num) and phonenumbers.is_valid_number(num):
                e164 = phonenumbers.format_number(num, phonenumbers.PhoneNumberFormat.E164)
                return "".join(filter(str.isdigit, e164))
        except Exception:
            continue
    # last-resort digit fallback (IN 10-digit 6-9xxx, SA 05xxx)
    try:
        digits = "".join(filter(str.isdigit, raw))
        if digits.startswith("00"):
            digits = digits[2:]
        if len(digits) == 10 and digits[0] in "6789":
            return "91" + digits  # India local
        if len(digits) == 11 and digits.startswith("0") and digits[1] in "6789":
            return "91" + digits[1:]  # India with trunk 0
        if len(digits) == 10 and digits.startswith("05"):
            return "966" + digits[1:]  # Saudi local
        if len(digits) == 9 and digits.startswith("5"):
            return "966" + digits  # Saudi without trunk
        if 9 <= len(digits) <= 15:
            return digits
    except Exception:
        pass
    return None


def geocode_city(city: str):
    """City name -> (lat, lon, bbox) via Nominatim. Returns None on fail."""
    try:
        r = requests.get(NOMINATIM_URL, params={"q": city, "format": "json", "limit": 1},
                         headers={"User-Agent": "GrowthPilot/1.0"}, timeout=15)
        r.raise_for_status()
        j = r.json()
        if not j:
            return None
        return {"lat": float(j[0]["lat"]), "lon": float(j[0]["lon"])}
    except Exception as e:
        print(f"[DISCOVERY] geocode fail {city}: {e}")
        return None


def search_osm(category: str, city: str, limit: int = 30):
    """Free/legal discovery via OSM Overpass around city center."""
    geo = geocode_city(city)
    if not geo:
        return []
    lat, lon = geo["lat"], geo["lon"]
    # ~25km radius
    query = f"""[out:json][timeout:25];(node["shop"](around:25000,{lat},{lon});node["amenity"](around:25000,{lat},{lon});node["office"](around:25000,{lat},{lon}););out {limit};"""
    mirrors = [OVERPASS_URL, "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
    for url in mirrors:
        try:
            r = requests.post(url, data=query, headers={"User-Agent": "GrowthPilot/1.0", "Content-Type": "application/x-www-form-urlencoded"}, timeout=15)
            r.raise_for_status()
            break
        except Exception as e:
            print(f"[DISCOVERY] OSM mirror {url} fail: {e}", flush=True)
            r = None
            continue
    if r is None:
        return []
    try:
        elements = r.json().get("elements", [])[:limit]
        leads = []
        cat_lower = category.lower()
        for el in elements:
            tags = el.get("tags", {})
            name = tags.get("name")
            if not name:
                continue
            # light category filter: name/brand/shop type contains term, else keep generic businesses
            blob = " ".join([str(v) for v in tags.values()]).lower()
            shop = str(tags.get("shop", "")).lower()
            amenity = str(tags.get("amenity", "")).lower()
            # keep if category matches or if no strong mismatch (OSM tags are sparse)
            website = tags.get("website") or tags.get("contact:website")
            phone = tags.get("phone") or tags.get("contact:phone")
            addr_parts = [tags.get("addr:street", ""), tags.get("addr:city", city), tags.get("addr:country", "")]
            address = " ".join([p for p in addr_parts if p]).strip()
            leads.append({
                "company_name": name[:80],
                "website": website or "",
                "raw_phone": phone or "",
                "address": address,
                "location": city,
                "industry": shop or amenity or category,
                "source": "osm",
                "snippet": blob[:200],
            })
        # if category-specific term given, prefer matches
        matched = [l for l in leads if cat_lower in l["snippet"] or cat_lower in l["industry"].lower() or cat_lower in l["company_name"].lower()]
        return matched[:limit] if matched else leads[:limit]
    except Exception as e:
        print(f"[DISCOVERY] OSM fail: {e}")
        return []


def search_tavily_free(category: str, city: str, limit: int = 10):
    """FREE: uses existing TAVILY_API_KEY to find business pages with phones.
    Queries JustDial/directories + official sites. No extra cost."""
    key = os.getenv("TAVILY_API_KEY", "")
    if not key:
        return []
    try:
        from tavily import TavilyClient
        tavily = TavilyClient(api_key=key)
        queries = [
            f"{category} in {city} phone number",
            f"best {category} {city} contact",
        ]
        out = []
        for q in queries:
            try:
                resp = tavily.search(query=q, search_depth="advanced", max_results=limit)
                for r in resp.get("results", []):
                    url = r.get("url", "")
                    title = r.get("title", "")[:80]
                    content = r.get("content", "") or ""
                    # phones often in snippet
                    phone = ""
                    for m in PHONE_RE.finditer(content + " " + title):
                        cand = normalize_e164(m.group(1), city=city)
                        if cand and len(cand) >= 10:
                            phone = cand
                            break
                    out.append({
                        "company_name": title or "Unknown",
                        "website": url,
                        "raw_phone": phone,
                        "address": city,
                        "location": city,
                        "industry": category,
                        "source": "tavily_free",
                        "snippet": content[:200],
                    })
            except Exception as e:
                print(f"[DISCOVERY] tavily q fail: {e}")
                continue
        return out[:limit * 2]
    except Exception as e:
        print(f"[DISCOVERY] tavily fail: {e}")
        return []


def search_google_places(category: str, city: str, limit: int = 20):
    """Official Google Places API (New) textSearch. Requires GOOGLE_PLACES_API_KEY."""
    key = os.getenv("GOOGLE_PLACES_API_KEY", "")
    if not key:
        return []
    try:
        r = requests.post(
            "https://places.googleapis.com/v1/places:searchText",
            headers={"Content-Type": "application/json", "X-Goog-Api-Key": key,
                     "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.primaryType"},
            json={"textQuery": f"{category} in {city}", "maxResultCount": min(limit, 20)},
            timeout=20,
        )
        r.raise_for_status()
        places = r.json().get("places", [])
        out = []
        for p in places:
            out.append({
                "company_name": p.get("displayName", {}).get("text", "Unknown")[:80],
                "website": p.get("websiteUri", ""),
                "raw_phone": p.get("internationalPhoneNumber", ""),
                "address": p.get("formattedAddress", ""),
                "location": city,
                "industry": p.get("primaryType", category),
                "source": "google_places_api",
                "snippet": p.get("formattedAddress", "")[:200],
            })
        return out
    except Exception as e:
        print(f"[DISCOVERY] Places API fail: {e}")
        return []


def extract_from_website(url: str, timeout: int = 12, city: str = ""):
    """Crawl homepage + /contact for publicly published phone/email. Returns dict."""
    if not url:
        return {"phone": "", "email": ""}
    if not url.startswith("http"):
        url = "https://" + url
    found_phone, found_email = "", ""
    try:
        for path in ["", "/contact", "/about"]:
            try:
                r = requests.get(url.rstrip("/") + path, headers={"User-Agent": "GrowthPilot/1.0"}, timeout=timeout)
                if r.status_code != 200 or "text/html" not in r.headers.get("Content-Type", "text/html"):
                    continue
                html = r.text
                if not found_email:
                    m = EMAIL_RE.search(html)
                    if m and "example." not in m.group(0) and ".png" not in m.group(0):
                        found_email = m.group(0)[:100]
                if not found_phone:
                    for m in PHONE_RE.finditer(html):
                        cand = normalize_e164(m.group(1), city=city)
                        if cand and len(cand) >= 9:
                            # skip short numbers
                            found_phone = cand
                            break
                if found_phone and found_email:
                    break
            except Exception:
                continue
    except Exception as e:
        print(f"[DISCOVERY] website crawl fail {url}: {e}")
    return {"phone": found_phone, "email": found_email}


def discover_leads(category: str, city: str, max_results: int = 30):
    """Main entry: 100% FREE — OSM + website crawl + Tavily (Places API optional bonus)."""
    seen = set()
    results = []
    tavily_leads = search_tavily_free(category, city, limit=10)  # FREE + fast + has phones
    osm = search_osm(category, city, limit=max_results)  # slow, often phoneless
    places = search_google_places(category, city, limit=max_results)  # [] unless key set
    combined = places + tavily_leads + osm  # fast phone-rich sources first
    for lead in combined:
        phone = normalize_e164(lead.get("raw_phone", ""), city=city)
        email = ""
        # enrich from website if phone missing (FREE crawl)
        if not phone and lead.get("website"):
            extra = extract_from_website(lead["website"], city=city)
            phone = extra["phone"] or ""
            email = extra["email"] or ""
        if not phone:
            continue  # no callable number -> never recommend (no dead Approve buttons)
        dedupe_key = phone
        if not dedupe_key or dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        lead["public_phone"] = phone
        lead["public_email"] = email
        results.append(lead)
        if len(results) >= max_results:
            break
    print(f"[DISCOVERY] {category} in {city}: {len(results)} leads (places={len(places)}, osm={len(osm)}, tavily={len(tavily_leads)})")
    return results
