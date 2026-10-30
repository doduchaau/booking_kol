#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KOL/KOC Network Inspector Engine using Playwright Network Interception
----------------------------------------------------------------------
Features:
- Pure Network Interception & Hydration State parsing (ZERO HTML/DOM parsing).
- Blocks heavy resources (images, styles, media, fonts, tracking ads) for < 3s load.
- Stealth Chromium anti-bot bypass.
- Supports SOCKS5/HTTP Proxy & Persistent User Data Dir (logged-in cookies).
- Outputs standardized UTF-8 JSON strictly to STDOUT.
"""

import sys
import os
import re
import json
import argparse
from typing import Dict, Any, List, Optional

# Ensure standard output and error use UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def log_debug(message: str) -> None:
    """Log messages to stderr so stdout remains 100% clean JSON."""
    sys.stderr.write(f"[Inspector] {message}\n")
    sys.stderr.flush()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="KOL Network Inspector CLI via Playwright")
    parser.add_argument("--url", required=True, type=str, help="Target Profile or Analytics URL")
    parser.add_argument(
        "--platform",
        required=True,
        type=str,
        choices=["tiktok", "shopee", "kalodata"],
        help="Platform identifier"
    )
    parser.add_argument("--proxy", type=str, default=None, help="Proxy server e.g. socks5://127.0.0.1:40000")
    parser.add_argument("--user-data-dir", type=str, default=None, help="Directory to preserve session cookies")
    parser.add_argument("--timeout", type=int, default=30, help="Navigation timeout in seconds")
    parser.add_argument("--headless", action="store_true", default=True, help="Run headless")
    parser.add_argument("--no-headless", action="store_false", dest="headless", help="Run with visible browser window")
    return parser.parse_args()


# Common tracking and ad patterns to block
BLOCKED_DOMAINS = [
    "google-analytics.com",
    "googletagmanager.com",
    "byteoversea.com/log/",
    "tiktokv.com/log/",
    "facebook.net",
    "connect.facebook.net",
    "doubleclick.net",
    "clarity.ms",
    "analytics",
    "adservice",
]

BLOCKED_RESOURCE_TYPES = ["image", "media", "font", "stylesheet", "imageset", "beacon", "csp_report"]


def intercept_routes(route) -> None:
    """Abort unnecessary heavy resources to optimize page load under 3 seconds."""
    req = route.request
    req_type = req.resource_type
    req_url = req.url.lower()

    if req_type in BLOCKED_RESOURCE_TYPES:
        route.abort()
        return

    for domain in BLOCKED_DOMAINS:
        if domain in req_url:
            route.abort()
            return

    route.continue_()


def find_key_recursive(data: Any, target_key: str) -> Optional[Any]:
    """Recursively search for a key in deeply nested dictionaries/lists."""
    if isinstance(data, dict):
        if target_key in data:
            return data[target_key]
        for v in data.values():
            found = find_key_recursive(v, target_key)
            if found is not None:
                return found
    elif isinstance(data, list):
        for item in data:
            found = find_key_recursive(item, target_key)
            if found is not None:
                return found
    return None


def extract_tiktok_post_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a raw TikTok post item from XHR or hydration state."""
    post_id = str(item.get("id") or item.get("videoId") or item.get("aweme_id") or "")
    desc = item.get("desc") or item.get("title") or ""
    create_time = item.get("createTime") or item.get("create_time") or 0

    stats = item.get("stats") or item.get("statistics") or {}
    play_count = int(stats.get("playCount") or stats.get("play_count") or 0)
    digg_count = int(stats.get("diggCount") or stats.get("digg_count") or 0)
    comment_count = int(stats.get("commentCount") or stats.get("comment_count") or 0)
    share_count = int(stats.get("shareCount") or stats.get("share_count") or 0)
    collect_count = int(stats.get("collectCount") or stats.get("collect_count") or 0)

    # Detect pinned post flags
    is_pinned = bool(
        item.get("isPinnedItem")
        or item.get("is_top") == 1
        or item.get("isTop") is True
        or item.get("pinned") is True
    )

    return {
        "id": post_id,
        "desc": desc,
        "create_time": create_time,
        "stats": {
            "playCount": play_count,
            "diggCount": digg_count,
            "commentCount": comment_count,
            "shareCount": share_count,
            "collectCount": collect_count,
        },
        "isPinnedItem": is_pinned,
    }


def inspect_with_playwright(args: argparse.Namespace) -> Dict[str, Any]:
    """Main Playwright inspection routine."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {
            "success": False,
            "platform": args.platform,
            "error": "Playwright is not installed. Run: pip install playwright && playwright install chromium"
        }

    collected_posts: List[Dict[str, Any]] = []
    seen_post_ids = set()
    captured_profile: Dict[str, Any] = {}
    intercepted_xhr: List[Dict[str, Any]] = []

    def on_response(response):
        """Network listener capturing XHR JSON payloads."""
        resp_url = response.url
        try:
            content_type = response.headers.get("content-type", "").lower()
            if "application/json" not in content_type and "text/json" not in content_type:
                return

            # Check TikTok Post Item List API
            if args.platform == "tiktok":
                if any(endpoint in resp_url for endpoint in ["/api/post/item_list/", "/api/recommend/item_list/", "/item_list/"]):
                    try:
                        json_data = response.json()
                        items = json_data.get("itemList") or json_data.get("items") or []
                        for raw_item in items:
                            normalized = extract_tiktok_post_item(raw_item)
                            p_id = normalized["id"]
                            if p_id and p_id not in seen_post_ids:
                                seen_post_ids.add(p_id)
                                collected_posts.append(normalized)
                        log_debug(f"Intercepted TikTok XHR itemList: +{len(items)} items (total: {len(collected_posts)})")
                    except Exception as err:
                        log_debug(f"Error parsing TikTok XHR: {err}")

            # Check Kalodata / Shopee / Affiliate endpoints
            elif args.platform in ["kalodata", "shopee"]:
                keywords = ["/creator/", "/author/", "/detail", "/performance", "/kol/", "/shop/", "/user/", "/analytics/"]
                if any(kw in resp_url.lower() for kw in keywords):
                    try:
                        payload = response.json()
                        intercepted_xhr.append({
                            "url": resp_url,
                            "status": response.status,
                            "data": payload
                        })
                        log_debug(f"Intercepted {args.platform} XHR: {resp_url[:80]}...")
                    except Exception as err:
                        log_debug(f"Error parsing {args.platform} XHR: {err}")
        except Exception as err:
            log_debug(f"Response listener error: {err}")

    # Launch Playwright
    with sync_playwright() as p:
        browser_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-infobars",
            "--no-first-run",
            "--no-default-browser-check",
            "--ignore-certificate-errors",
            "--window-size=1920,1080",
        ]

        proxy_config = None
        if args.proxy:
            proxy_config = {"server": args.proxy}
            log_debug(f"Using Proxy: {args.proxy}")

        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        viewport = {"width": 1920, "height": 1080}

        context = None
        browser = None

        try:
            if args.user_data_dir:
                os.makedirs(args.user_data_dir, exist_ok=True)
                log_debug(f"Launching Persistent Context with dir: {args.user_data_dir}")
                context = p.chromium.launch_persistent_context(
                    user_data_dir=args.user_data_dir,
                    headless=args.headless,
                    args=browser_args,
                    proxy=proxy_config,
                    user_agent=user_agent,
                    viewport=viewport,
                    locale="vi-VN",
                    timezone_id="Asia/Ho_Chi_Minh",
                )
                page = context.pages[0] if context.pages else context.new_page()
            else:
                browser = p.chromium.launch(
                    headless=args.headless,
                    args=browser_args,
                    proxy=proxy_config,
                )
                context = browser.new_context(
                    user_agent=user_agent,
                    viewport=viewport,
                    locale="vi-VN",
                    timezone_id="Asia/Ho_Chi_Minh",
                )
                page = context.new_page()

            # Anti-detection stealth script injection
            stealth_js = """
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            """
            context.add_init_script(stealth_js)

            # Block heavy resources to achieve < 3s load and low RAM
            page.route("**/*", intercept_routes)

            # Bind XHR listener
            page.on("response", on_response)

            log_debug(f"Navigating to {args.url} (timeout: {args.timeout}s)...")
            try:
                page.goto(args.url, wait_until="domcontentloaded", timeout=args.timeout * 1000)
            except Exception as nav_err:
                log_debug(f"Navigation DOMContentLoaded timeout or notice: {nav_err}")

            # Platform specific state extraction
            if args.platform == "tiktok":
                # 1. Parse Hydration Script
                hydration_data = None
                script_ids = ["__UNIVERSAL_DATA_FOR_REHYDRATION__", "SIGI_STATE", "__NEXT_DATA__"]
                for s_id in script_ids:
                    try:
                        element = page.query_selector(f"script#{s_id}")
                        if element:
                            raw_json = element.inner_text()
                            if raw_json and raw_json.strip():
                                hydration_data = json.loads(raw_json)
                                log_debug(f"Successfully extracted Hydration Script: #{s_id}")
                                break
                    except Exception as parse_err:
                        log_debug(f"Failed to parse script #{s_id}: {parse_err}")

                if hydration_data:
                    # Extract user profile info
                    user_info = find_key_recursive(hydration_data, "userInfo")
                    if isinstance(user_info, dict):
                        u_user = user_info.get("user") or {}
                        u_stats = user_info.get("stats") or {}

                        captured_profile = {
                            "uniqueId": u_user.get("uniqueId") or "",
                            "nickname": u_user.get("nickname") or "",
                            "avatarLarger": u_user.get("avatarLarger") or u_user.get("avatarMedium") or "",
                            "signature": u_user.get("signature") or "",
                            "secUid": u_user.get("secUid") or "",
                            "verified": bool(u_user.get("verified", False)),
                            "followerCount": int(u_stats.get("followerCount") or 0),
                            "followingCount": int(u_stats.get("followingCount") or 0),
                            "heartCount": int(u_stats.get("heartCount") or 0),
                            "videoCount": int(u_stats.get("videoCount") or 0),
                            "diggCount": int(u_stats.get("diggCount") or 0),
                        }

                    # Extract initial posts embedded directly in hydration state if present
                    item_module = find_key_recursive(hydration_data, "ItemModule")
                    if isinstance(item_module, dict):
                        for item in item_module.values():
                            if isinstance(item, dict):
                                normalized = extract_tiktok_post_item(item)
                                p_id = normalized["id"]
                                if p_id and p_id not in seen_post_ids:
                                    seen_post_ids.add(p_id)
                                    collected_posts.append(normalized)
                        log_debug(f"Extracted {len(collected_posts)} initial posts from Hydration ItemModule")

                # If post count < 15, perform gentle mouse scroll to trigger /api/post/item_list/ XHR
                if len(collected_posts) < 15:
                    log_debug(f"Currently have {len(collected_posts)} posts. Performing soft scroll...")
                    for scroll_idx in range(2):
                        page.mouse.wheel(0, 1000)
                        page.wait_for_timeout(1500)
                        if len(collected_posts) >= 15:
                            break

            elif args.platform in ["kalodata", "shopee"]:
                # Wait briefly to let background XHR requests complete
                page.wait_for_timeout(3000)

                # Attempt to extract visible profile header if any
                try:
                    title = page.title()
                    captured_profile["title"] = title
                except Exception:
                    pass

        finally:
            if context:
                try:
                    context.close()
                except Exception:
                    pass
            if browser:
                try:
                    browser.close()
                except Exception:
                    pass

    return {
        "success": True,
        "platform": args.platform,
        "profile": captured_profile,
        "posts": collected_posts,
        "xhr_dumps": intercepted_xhr,
    }


def main():
    args = parse_arguments()
    try:
        result = inspect_with_playwright(args)
    except Exception as exc:
        result = {
            "success": False,
            "platform": args.platform,
            "error": f"Unhandled inspector exception: {str(exc)}"
        }

    # Print clean UTF-8 JSON strictly to STDOUT
    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=None))
    sys.stdout.write("\n")
    sys.stdout.flush()


if __name__ == "__main__":
    main()

